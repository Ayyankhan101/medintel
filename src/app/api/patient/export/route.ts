/**
 * GET /api/patient/export
 *
 * Right-to-export under draft PK DPA 2023 + PMDC telemed guideline. Returns
 * a JSON bundle of everything we hold on the signed-in patient — profile,
 * triages, appointments, prescriptions, medical records.
 *
 * Format: application/json (single document). PDF/XLSX export is a fast
 * follow-up; for the demo, JSON keeps the route simple and lets a third
 * party (insurer, hospital intake desk) machine-import the data.
 *
 * Rate limit: 2 per hour per user — exports include PHI, so we don't want a
 * compromised account to mass-exfiltrate.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimitDb } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimitDb('patient-export', session.user.id!, { max: 2, windowMs: 60 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Already exported recently. Try again in an hour.' }, { status: 429 })

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id! },
    include: {
      patient: {
        include: {
          medicalRecords: { orderBy: { recordedAt: 'desc' } },
          triages:        { orderBy: { createdAt:  'desc' } },
          appointments:   {
            orderBy: { scheduledAt: 'desc' },
            include: {
              doctor: { include: { user: { select: { name: true } } } },
              escrow: true,
              note:   true,
              review: true,
            },
          },
          reviews: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  })
  if (!user?.patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const bundle = {
    exportedAt:  new Date().toISOString(),
    exportedFor: { id: user.id, email: user.email, medIntelCode: user.medIntelCode },
    profile: {
      name:          user.name,
      email:         user.email,
      phone:         user.phone,
      cnicNumber:    user.cnicNumber,
      kycStatus:     user.kycStatus,
      kycVerifiedAt: user.kycVerifiedAt,
      dateOfBirth:   user.patient.dateOfBirth,
      gender:        user.patient.gender,
      address:       user.patient.address,
      createdAt:     user.createdAt,
    },
    triages:        user.patient.triages,
    appointments:   user.patient.appointments.map(a => ({
      id:                 a.id,
      scheduledAt:        a.scheduledAt,
      status:             a.status,
      severityScore:      a.severityScore,
      severityLevel:      a.severityLevel,
      department:         a.department,
      aiSummary:          a.aiSummary,
      transcript:         a.transcript,
      prescriptionUrl:    a.prescriptionUrl,
      prescriptionText:   a.prescriptionText,
      cancellationReason: a.cancellationReason,
      doctor: a.doctor ? {
        name:           a.doctor.user.name,
        specialization: a.doctor.specialization,
        licenseNumber:  a.doctor.licenseNumber,
      } : null,
      escrow: a.escrow ? {
        amount:   a.escrow.amount,
        currency: a.escrow.currency,
        status:   a.escrow.status,
        heldAt:   a.escrow.heldAt,
      } : null,
      note:   a.note,
      review: a.review,
    })),
    medicalRecords: user.patient.medicalRecords,
    reviews:        user.patient.reviews,
  }

  void audit('patient.export', 'Patient', user.patient.id, { actorId: user.id, actorRole: 'PATIENT' })

  const filename = `medintel-export-${user.medIntelCode ?? user.id}-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status:  200,
    headers: {
      'content-type':        'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control':       'no-store',
    },
  })
}
