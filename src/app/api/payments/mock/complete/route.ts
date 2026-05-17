/**
 * Demo-only endpoint: simulates a successful payment from the mock provider.
 * The /mock-pay/[ref] page POSTs to this route after the user clicks "Pay".
 * Logic mirrors the SafePay webhook path so the rest of the app sees an
 * identical "payment succeeded → audit log" outcome.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { auth } from '@/lib/auth'

const schema = z.object({
  providerRef:   z.string().min(1),
  appointmentId: z.string().min(1),
  amount:        z.number().nonnegative(),
  type:          z.enum(['payment.succeeded', 'payment.failed']),
})

export async function POST(req: NextRequest) {
  // Guard: at minimum the user has to be signed in. The mock provider is for
  // demos, but we don't want a stranger able to flip arbitrary escrow rows.
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const escrow = await prisma.escrow.findUnique({
    where:   { providerRef: parsed.data.providerRef },
    include: { appointment: { include: { patient: { include: { user: true } } } } },
  })
  if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
  if (escrow.appointment.patient.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (parsed.data.type === 'payment.failed') {
    // Idempotent: already cancelled → nothing to do.
    if (escrow.appointment.status === 'CANCELLED' || escrow.appointment.status === 'REFUNDED')
      return NextResponse.json({ ok: true })
    await Promise.all([
      prisma.appointment.update({
        where: { id: escrow.appointmentId },
        data:  { status: 'CANCELLED', cancellationReason: 'payment_failed' },
      }),
      // Mark escrow REFUNDED (no money ever moved) so /api/escrow/refund can't
      // re-fire on a payment that was never captured.
      prisma.escrow.update({
        where: { id: escrow.id },
        data:  { status: 'REFUNDED', refundedAt: new Date() },
      }),
    ])
    return NextResponse.json({ ok: true })
  }

  // payment.succeeded: keep escrow HELD (funds at PSP). Audit so the dashboard
  // shows the patient paid; the appointment status stays SCHEDULED.
  // Idempotent: if escrow already moved past HELD, the payment was already counted.
  if (escrow.status !== 'HELD') return NextResponse.json({ ok: true })

  void audit('escrow.captured', 'Appointment', escrow.appointmentId, {
    provider: 'mock', amount: parsed.data.amount, actorId: session.user.id, actorRole: session.user.role,
  })
  return NextResponse.json({ ok: true })
}
