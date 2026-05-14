import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { releaseEscrowToDoctor } from '@/lib/stripe'
import { sendPrescriptionReady, sendEscrowReleased } from '@/lib/email'

const schema = z.object({
  appointmentId:    z.string().min(1),
  prescriptionText: z.string().min(5, 'Prescription text required'),
  fileUrl:          z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Only doctors can upload prescriptions' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: {
      escrow:  true,
      doctor:  { include: { user: true } },
      patient: { include: { user: true } },
    },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (!appointment.doctor)
    return NextResponse.json({ error: 'No doctor assigned to this appointment' }, { status: 422 })
  if (appointment.doctor.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.appointment.update({
    where: { id: appointment.id },
    data:  {
      prescriptionUrl:  parsed.data.fileUrl ?? null,
      prescriptionText: parsed.data.prescriptionText,
    },
  })

  await prisma.medicalRecord.create({
    data: {
      patientId:  appointment.patientId,
      type:       'PRESCRIPTION',
      title:      `Prescription — ${new Date().toLocaleDateString('en-PK')}`,
      content:    parsed.data.prescriptionText,
      fileUrl:    parsed.data.fileUrl ?? null,
      recordedAt: new Date(),
    },
  })

  // Auto-release escrow
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId) {
    await releaseEscrowToDoctor(
      appointment.escrow.stripePaymentIntentId,
      appointment.doctor.stripeAccountId,
      Number(appointment.escrow.amount)
    )
    await Promise.all([
      prisma.escrow.update({
        where: { id: appointment.escrow.id },
        data:  { status: 'RELEASED', releasedAt: new Date() },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      }),
    ])
  }

  // Fire-and-forget notifications. Never block the response on email.
  if (appointment.patient.user.email) {
    void sendPrescriptionReady({
      to:            appointment.patient.user.email,
      patientName:   appointment.patient.user.name ?? 'there',
      doctorName:    appointment.doctor.user.name ?? 'your doctor',
      appointmentId: appointment.id,
    })
  }
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId && appointment.doctor.user.email) {
    void sendEscrowReleased({
      to:            appointment.doctor.user.email,
      doctorName:    appointment.doctor.user.name ?? 'Doctor',
      amount:        Number(appointment.escrow.amount),
      appointmentId: appointment.id,
    })
  }

  return NextResponse.json({ message: 'Prescription saved and payment released' })
}
