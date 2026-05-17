import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPatientRefundEligible } from '@/lib/stripe'
import { providerFor, type ProviderId } from '@/lib/payments'
import { audit } from '@/lib/audit'

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
  const isAdmin   = session.user.role === 'ADMIN'
  if (!isPatient && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!appointment.escrow || appointment.escrow.status !== 'HELD')
    return NextResponse.json({ error: 'No held escrow to refund' }, { status: 409 })
  // Patient: free cancel before scheduledAt, or after a 2h no-show grace.
  // Admin: bypass the eligibility gate (manual intervention path).
  if (!isAdmin && !isPatientRefundEligible(appointment.scheduledAt, appointment.status))
    return NextResponse.json({ error: 'Appointment is not eligible for refund' }, { status: 422 })

  // Step 1: PSP call — if this fails the PI is still cancellable on retry.
  try {
    await providerFor(appointment.escrow.provider as ProviderId).refund({
      providerRef: appointment.escrow.providerRef ?? appointment.escrow.stripePaymentIntentId!,
      amount:      Number(appointment.escrow.amount),
    })
  } catch (e) {
    console.error('[escrow/refund] PSP refund error', e)
    return NextResponse.json({ error: 'Refund failed — try again or contact support' }, { status: 502 })
  }

  // Step 2: record in DB. PSP refund already happened — if this write fails,
  // don't 502 (money is gone; retrying would re-attempt an already-cancelled payment).
  await Promise.all([
    prisma.escrow.update({
      where: { id: appointment.escrow.id },
      data:  { status: 'REFUNDED', refundedAt: new Date() },
    }),
    prisma.appointment.update({
      where: { id: appointment.id },
      data:  { status: 'REFUNDED' },
    }),
  ]).catch(e => {
    console.error('[escrow/refund] DB update failed after PSP refund', e)
    void audit('escrow.refund_db_failed', 'Appointment', appointment.id, {
      escrowId: appointment.escrow!.id, error: String(e),
    })
  })

  await audit('escrow.refund', 'Appointment', appointment.id, {
    actorId: session.user.id, actorRole: session.user.role,
    amount: Number(appointment.escrow.amount),
    escrowId: appointment.escrow.id,
  })

  return NextResponse.json({ message: 'Refund issued to patient' })
}
