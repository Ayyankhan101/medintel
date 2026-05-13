import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createEscrowPaymentIntent } from '@/lib/stripe'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { patient: { include: { user: true } }, doctor: true, escrow: true },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (appointment.patient.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!appointment.doctor)
    return NextResponse.json({ error: 'No doctor assigned to this appointment' }, { status: 422 })
  if (!appointment.doctor.stripeAccountId)
    return NextResponse.json({ error: 'Doctor payment account not set up' }, { status: 422 })
  if (appointment.escrow)
    return NextResponse.json({ error: 'Payment already exists for this appointment' }, { status: 409 })

  const fee           = Number(appointment.doctor.consultationFee)
  const paymentIntent = await createEscrowPaymentIntent(fee, appointment.doctor.stripeAccountId, appointment.id)

  await prisma.escrow.create({
    data: {
      appointmentId:         appointment.id,
      amount:                fee,
      stripePaymentIntentId: paymentIntent.id,
    },
  })

  return NextResponse.json({
    clientSecret:    paymentIntent.client_secret,
    amount:          fee,
    paymentIntentId: paymentIntent.id,
  })
}
