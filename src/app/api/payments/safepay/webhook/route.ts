/**
 * SafePay webhook → normalized event → escrow state machine.
 *
 * Wire-up: SafePay dashboard → Webhooks → POST <host>/api/payments/safepay/webhook
 * Signed with HMAC-SHA256(SAFEPAY_WEBHOOK_SECRET, rawBody). The adapter
 * verifies + returns a normalized event we can switch on.
 *
 * Idempotency: shared ProcessedStripeEvent table — we just prefix the event id
 * with `sp_` so it can't collide with Stripe's. (Same dedupe semantics; the
 * table name is a historical artefact and will be renamed in a later pass.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { safepayProvider } from '@/lib/payments/safepay'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  let event
  try {
    event = await safepayProvider.verifyWebhook(raw, req.headers)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const eventId = `sp_${event.eventId}`
  try {
    await prisma.processedStripeEvent.create({ data: { eventId, type: event.type } })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  try {
    if (event.type === 'payment.succeeded' && event.providerRef) {
      const escrow = await prisma.escrow.findUnique({ where: { providerRef: event.providerRef } })
      if (escrow && escrow.status === 'HELD') {
        // Money is at the PSP; no app-level state change needed beyond a
        // confirmation flag in audit so admins can see the patient paid.
        void audit('escrow.captured', 'Appointment', escrow.appointmentId, {
          provider: 'safepay', amount: event.amount,
        })
      }
    }
    if (event.type === 'payment.failed' && event.providerRef) {
      // Look up the appointment via our own escrow row — never trust the
      // appointmentId echoed back in the webhook payload (an attacker who
      // forges a signed event could otherwise cancel arbitrary appointments).
      const escrow = await prisma.escrow.findUnique({
        where:  { providerRef: event.providerRef },
        select: { appointmentId: true },
      })
      if (escrow) {
        await prisma.appointment.update({
          where: { id: escrow.appointmentId },
          data:  { status: 'CANCELLED', cancellationReason: 'payment_failed' },
        })
      }
    }
    if (event.type === 'payment.refunded' && event.providerRef) {
      const escrow = await prisma.escrow.findUnique({ where: { providerRef: event.providerRef } })
      if (escrow && escrow.status !== 'REFUNDED') {
        await prisma.escrow.update({
          where: { id: escrow.id },
          data:  { status: 'REFUNDED', refundedAt: new Date() },
        })
        await prisma.appointment.update({
          where: { id: escrow.appointmentId },
          data:  { status: 'REFUNDED' },
        })
        void audit('escrow.refund_reconcile', 'Appointment', escrow.appointmentId, { provider: 'safepay' })
      }
    }
  } catch (e) {
    await prisma.processedStripeEvent.delete({ where: { eventId } }).catch(() => {})
    console.error('[safepay-webhook] handler error', e)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
