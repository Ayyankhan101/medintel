/**
 * POST /api/admin/refund — admin-issued full or partial escrow refund.
 *   body: { appointmentId, amount?, reason }
 *
 * Handles every escrow state:
 *   HELD     → cancel PI (full only)
 *   RELEASED → refunds.create({ amount?, reverse_transfer: true })
 *
 * `amount` is in PKR. Omit for a full refund. Partial refunds keep
 * Escrow.status = RELEASED so the doctor's transfer history stays intact.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { providerFor, type ProviderId } from '@/lib/payments'
import { audit } from '@/lib/audit'
import { captureError } from '@/lib/observability'
import { rateLimitDb } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  appointmentId: z.string().min(1),
  amount:        z.number().int().positive().optional(),  // PKR (zero-decimal)
  reason:        z.string().trim().min(3).max(500),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const rl = await rateLimitDb('admin-refund', session.user.id!, { max: 5, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body   = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const appt = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { escrow: true, patient: { include: { user: true } } },
  })
  if (!appt || !appt.escrow) return NextResponse.json({ error: 'Appointment / escrow not found' }, { status: 404 })

  const escrow         = appt.escrow
  const totalPkr       = Number(escrow.amount)
  const alreadyRefunded = Number(escrow.refundedAmount ?? 0)
  const remaining      = totalPkr - alreadyRefunded
  const requestedAmt   = parsed.data.amount ?? remaining

  if (escrow.status === 'REFUNDED')
    return NextResponse.json({ error: 'Escrow already fully refunded' }, { status: 409 })
  if (requestedAmt <= 0 || requestedAmt > remaining)
    return NextResponse.json({ error: `Amount must be between 1 and ${remaining} PKR` }, { status: 422 })

  // Step 1: PSP refund — if this throws, no money moved and it's safe to retry.
  try {
    if (escrow.status === 'HELD') {
      if (requestedAmt !== totalPkr)
        return NextResponse.json({ error: 'HELD escrows can only be fully refunded (not yet captured)' }, { status: 422 })
      await providerFor(escrow.provider as ProviderId).refund({
        providerRef: escrow.providerRef ?? escrow.stripePaymentIntentId!,
        amount:      totalPkr,
      })
    } else {
      await providerFor(escrow.provider as ProviderId).refundCaptured({
        providerRef: escrow.providerRef ?? escrow.stripePaymentIntentId!,
        amount:      requestedAmt === totalPkr ? undefined : requestedAmt,
        reason:      parsed.data.reason,
      })
    }
  } catch (e) {
    captureError(e, { tag: 'admin.refund.psp_error', appointmentId: appt.id })
    return NextResponse.json({ error: 'Refund failed at payment processor — try again' }, { status: 502 })
  }

  // Step 2: DB reconciliation — PSP already refunded. If this throws, money
  // is returned to customer but our DB is stale. Log to Sentry so ops can
  // manually reconcile rather than a retry double-refunding the customer.
  const newTotal = alreadyRefunded + requestedAmt
  const isFull   = newTotal >= totalPkr

  try {
    await prisma.$transaction([
      prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          refundedAmount: new Prisma.Decimal(newTotal),
          refundReason:   parsed.data.reason,
          ...(isFull ? { status: 'REFUNDED', refundedAt: new Date() } : {}),
        },
      }),
      ...(isFull ? [prisma.appointment.update({
        where: { id: appt.id },
        data: {
          status:             'REFUNDED',
          cancelledAt:        appt.cancelledAt ?? new Date(),
          cancelledBy:        appt.cancelledBy ?? 'ADMIN',
          cancellationReason: appt.cancellationReason ?? parsed.data.reason,
        },
      })] : []),
    ])
  } catch (e) {
    // PSP refunded but DB failed — flag for manual reconciliation.
    captureError(e, { tag: 'admin.refund.db_error_after_psp_success', appointmentId: appt.id, refundedAmt: requestedAmt })
    return NextResponse.json({ error: 'Refund processed by payment provider but database update failed — contact support with appointment ID' }, { status: 500 })
  }

  void audit('escrow.admin_refund', 'Appointment', appt.id, {
    actorId:   session.user.id,
    actorRole: 'ADMIN',
    amount:    requestedAmt,
    total:     newTotal,
    isFull,
    reason:    parsed.data.reason,
  })

  return NextResponse.json({
    ok:             true,
    refundedAmount: newTotal,
    remaining:      totalPkr - newTotal,
    isFull,
  })
}
