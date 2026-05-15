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
import { refundEscrow, refundCapturedEscrow } from '@/lib/stripe'
import { audit } from '@/lib/audit'

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

  try {
    if (escrow.status === 'HELD') {
      // No partial refunds for uncaptured PIs — Stripe will just cancel the auth.
      if (requestedAmt !== totalPkr)
        return NextResponse.json({ error: 'HELD escrows can only be fully refunded (not yet captured)' }, { status: 422 })
      await refundEscrow(escrow.stripePaymentIntentId)
    } else {
      // RELEASED → captured + transferred. Refund + reverse transfer.
      await refundCapturedEscrow(escrow.stripePaymentIntentId, requestedAmt === totalPkr ? undefined : requestedAmt)
    }

    const newTotal = alreadyRefunded + requestedAmt
    const isFull   = newTotal >= totalPkr

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
  } catch (e) {
    console.error('[admin.refund] stripe error', e)
    return NextResponse.json({ error: 'Refund failed at payment processor — try again' }, { status: 502 })
  }
}
