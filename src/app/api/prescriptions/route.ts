import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { releaseEscrowToDoctor } from '@/lib/stripe'

const schema = z.object({
  appointmentId:     z.string().min(1),
  prescriptionS3Key: z.string().min(1),
  prescriptionText:  z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'DOCTOR')
    return NextResponse.json({ error: 'Only doctors can upload prescriptions' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: {
      escrow:  true,
      doctor:  { include: { user: true } },
      patient: true,
    },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (appointment.doctor.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Save prescription to appointment
  await prisma.appointment.update({
    where: { id: appointment.id },
    data:  {
      prescriptionUrl:  parsed.data.prescriptionS3Key,
      prescriptionText: parsed.data.prescriptionText,
    },
  })

  // Save to patient's medical vault
  await prisma.medicalRecord.create({
    data: {
      patientId:  appointment.patientId,
      type:       'PRESCRIPTION',
      title:      `Prescription — ${new Date().toLocaleDateString('en-PK')}`,
      content:    parsed.data.prescriptionText ?? 'See attached file',
      fileUrl:    parsed.data.prescriptionS3Key,
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

  return NextResponse.json({ message: 'Prescription saved and payment released' })
}
