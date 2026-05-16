/**
 * GET /api/appointments/[id]/claim.pdf
 *
 * Patient-downloadable insurance claim form. Same access rules as the
 * existing /prescription.pdf route: patient or doctor on this appointment, or
 * admin. The PDF is rendered server-side and streamed inline.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderClaimPdf } from '@/lib/pdf/claim'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const appt = await prisma.appointment.findUnique({
    where:   { id },
    include: {
      patient: { include: { user: true } },
      doctor:  { include: { user: true } },
      escrow:  true,
    },
  })
  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const isPatient = appt.patient.user.id === session.user.id
  const isDoctor  = appt.doctor?.user.id === session.user.id
  const isAdmin   = session.user.role === 'ADMIN'
  if (!isPatient && !isDoctor && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Only completed appointments get claim forms — keeps insurers from
  // accepting forms for cancelled visits.
  if (appt.status !== 'COMPLETED')
    return NextResponse.json({ error: 'Claim PDF available after consultation is completed' }, { status: 422 })

  const dob = await prisma.patient.findUnique({ where: { id: appt.patientId }, select: { dateOfBirth: true } })

  const pdf = await renderClaimPdf({
    patient: {
      name:         appt.patient.user.name,
      medIntelCode: appt.patient.user.medIntelCode,
      cnic:         appt.patient.user.cnicNumber,
      email:        appt.patient.user.email,
      dateOfBirth:  dob?.dateOfBirth ?? null,
    },
    doctor: appt.doctor ? {
      name:           appt.doctor.user.name,
      specialization: appt.doctor.specialization,
      licenseNumber:  appt.doctor.licenseNumber,
    } : null,
    appointment: {
      id:               appt.id,
      scheduledAt:      appt.scheduledAt,
      completedAt:      appt.completedAt,
      department:       appt.department,
      severityLevel:    appt.severityLevel,
      aiSummary:        appt.aiSummary,
      prescriptionText: appt.prescriptionText,
    },
    amount:   appt.escrow ? Number(appt.escrow.amount) : 0,
    currency: appt.escrow?.currency ?? 'PKR',
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type':        'application/pdf',
      'content-disposition': `inline; filename="claim-${appt.id}.pdf"`,
      'cache-control':       'private, no-store',
    },
  })
}
