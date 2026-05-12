import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refundEscrow, isAutoRefundEligible } from '@/lib/stripe'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { escrow: true, patient: { include: { user: true } } },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const isPatient = appointment.patient.user.id === session.user.id
  const isAdmin   = (session.user as any).role === 'ADMIN'
  if (!isPatient && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!appointment.escrow || appointment.escrow.status !== 'HELD')
    return NextResponse.json({ error: 'No held escrow to refund' }, { status: 409 })
  if (!isAutoRefundEligible(appointment.scheduledAt, appointment.status))
    return NextResponse.json({ error: 'Appointment is not yet eligible for refund (within 2-hour grace period)' }, { status: 422 })

  await refundEscrow(appointment.escrow.stripePaymentIntentId)

  await Promise.all([
    prisma.escrow.update({
      where: { id: appointment.escrow.id },
      data:  { status: 'REFUNDED', refundedAt: new Date() },
    }),
    prisma.appointment.update({
      where: { id: appointment.id },
      data:  { status: 'REFUNDED' },
    }),
  ])

  return NextResponse.json({ message: 'Refund issued to patient' })
}
