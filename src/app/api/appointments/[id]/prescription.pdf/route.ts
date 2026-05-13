import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderPrescriptionPdf } from '@/lib/pdf/prescription'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { user: true } },
      doctor:  { include: { user: true } },
    },
  })
  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the patient or the assigned doctor (or admin) can download.
  const isPatient = appointment.patient.user.id === session.user.id
  const isDoctor  = appointment.doctor?.user.id === session.user.id
  const isAdmin   = (session.user as { role?: string }).role === 'ADMIN'
  if (!isPatient && !isDoctor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pdf = await renderPrescriptionPdf({
    patient: {
      name:         appointment.patient.user.name,
      medIntelCode: appointment.patient.user.medIntelCode,
      email:        appointment.patient.user.email,
      cnic:         appointment.patient.user.cnicNumber,
    },
    doctor: appointment.doctor
      ? {
          name:           appointment.doctor.user.name,
          specialization: appointment.doctor.specialization,
          licenseNumber:  appointment.doctor.licenseNumber,
          email:          appointment.doctor.user.email,
        }
      : null,
    appointment: {
      id:               appointment.id,
      scheduledAt:      appointment.scheduledAt,
      completedAt:      appointment.completedAt,
      department:       appointment.department,
      transcript:       appointment.transcript,
      aiSummary:        appointment.aiSummary,
      severityScore:    appointment.severityScore,
      severityLevel:    appointment.severityLevel,
      prescriptionText: appointment.prescriptionText,
    },
    generatedAt: new Date(),
  })

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="medintel-${appointment.id.slice(0, 8)}.pdf"`,
      'Cache-Control':       'private, no-store',
    },
  })
}
