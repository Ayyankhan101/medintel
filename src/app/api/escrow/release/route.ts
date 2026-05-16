import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { releaseEscrowToDoctor } from '@/lib/stripe'
import { sendReviewNudge } from '@/lib/email'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Only doctors can release escrow' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { escrow: true, doctor: { include: { user: true } }, patient: { include: { user: true } } },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (!appointment.doctor)
    return NextResponse.json({ error: 'No doctor assigned to this appointment' }, { status: 422 })
  if (appointment.doctor.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!appointment.escrow)
    return NextResponse.json({ error: 'No escrow found for this appointment' }, { status: 404 })
  if (appointment.escrow.status !== 'HELD')
    return NextResponse.json({ error: 'Escrow is not in HELD state' }, { status: 409 })
  if (!appointment.prescriptionUrl)
    return NextResponse.json({ error: 'Prescription must be uploaded before releasing payment' }, { status: 422 })

  await releaseEscrowToDoctor(
    appointment.escrow.stripePaymentIntentId!,
    appointment.doctor.stripeAccountId!,
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

  if (appointment.patient.user.email) {
    void sendReviewNudge({
      to:            appointment.patient.user.email,
      patientName:   appointment.patient.user.name ?? 'there',
      doctorName:    appointment.doctor.user.name ?? 'your doctor',
      appointmentId: appointment.id,
    })
  }

  return NextResponse.json({ message: 'Payment released to doctor' })
}
