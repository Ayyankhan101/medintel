/**
 * JazzCash return-URL handler.
 *
 * JazzCash does not send server-to-server webhooks like Stripe. Instead, after
 * the patient completes payment on JazzCash's hosted page, the browser is
 * redirected (via form POST) to `pp_ReturnURL` — which is this endpoint.
 *
 * Dashboard setup:
 *   JazzCash Merchant Portal → Integration Settings → Return URL:
 *   https://<your-domain>/api/payments/jazzcash/webhook
 *
 * Because the browser posts here directly, we:
 *   1. Parse + verify the HMAC signature.
 *   2. Update the escrow state machine.
 *   3. Redirect the patient to the appropriate UI page.
 *
 * Idempotency: uses the same ProcessedStripeEvent table as Stripe/SafePay,
 * prefixed with `jc_` to avoid key collisions.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jazzcashProvider } from '@/lib/payments/jazzcash'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const APP_URL = () => process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  // JazzCash posts application/x-www-form-urlencoded, not JSON.
  const rawBody = await req.text()

  let event
  try {
    event = await jazzcashProvider.verifyWebhook(rawBody, req.headers)
  } catch {
    // Signature invalid or malformed body — reject.
    // Don't redirect the patient from here; JazzCash will show an error on
    // their side if the return POST gets a non-2xx.
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  // Idempotency — same dedupe table as other providers.
  const eventId = `jc_${event.eventId}`
  try {
    await prisma.processedStripeEvent.create({ data: { eventId, type: event.type } })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      // Duplicate delivery — patient refreshed the return page, or JazzCash retried.
      return redirect(event.appointmentId, event.type === 'payment.succeeded')
    }
    console.error('[jazzcash-webhook] dedupe insert failed', e)
    return NextResponse.json({ error: 'Dedupe insert failed' }, { status: 500 })
  }

  try {
    const escrow = event.providerRef
      ? await prisma.escrow.findUnique({ where: { providerRef: event.providerRef } })
      : null

    const orphan = (type: string) => audit(
      'webhook.orphan', 'Escrow',
      event.providerRef ?? 'unknown',
      { provider: 'jazzcash', type, eventId: event.eventId },
    )

    if (event.type === 'payment.succeeded') {
      if (escrow?.status === 'HELD') {
        // JazzCash settled synchronously — mark escrow HELD (already is) and
        // confirm in the audit log. The escrow is released when the doctor
        // completes the consultation (same flow as Stripe).
        void audit('escrow.captured', 'Appointment', escrow.appointmentId, {
          provider: 'jazzcash', amount: event.amount,
        })
      } else if (!escrow) {
        void orphan('payment.succeeded')
      }
    }

    if (event.type === 'payment.failed') {
      if (escrow) {
        await prisma.appointment.update({
          where: { id: escrow.appointmentId },
          data:  { status: 'CANCELLED', cancellationReason: 'payment_failed' },
        })
      } else {
        void orphan('payment.failed')
      }
    }

    if (event.type === 'payment.refunded') {
      if (escrow && escrow.status !== 'REFUNDED') {
        await prisma.$transaction([
          prisma.escrow.update({
            where: { id: escrow.id },
            data:  { status: 'REFUNDED', refundedAt: new Date() },
          }),
          prisma.appointment.update({
            where: { id: escrow.appointmentId },
            data:  { status: 'REFUNDED' },
          }),
        ])
        void audit('escrow.refund_reconcile', 'Appointment', escrow.appointmentId, {
          provider: 'jazzcash',
        })
      } else if (!escrow) {
        void orphan('payment.refunded')
      }
    }
  } catch (e) {
    await prisma.processedStripeEvent.delete({ where: { eventId } }).catch(() => {})
    console.error('[jazzcash-webhook] handler error', e)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  // Redirect the patient back to the app — their browser is waiting on this response.
  return redirect(event.appointmentId, event.type === 'payment.succeeded')
}

function redirect(appointmentId: string | undefined, success: boolean): NextResponse {
  const base = APP_URL()
  if (appointmentId) {
    const dest = success
      ? `${base}/consultation/${appointmentId}?payment=success`
      : `${base}/consultation/${appointmentId}?payment=failed`
    return NextResponse.redirect(dest, { status: 303 })
  }
  return NextResponse.redirect(success ? `${base}/` : `${base}/?payment=failed`, { status: 303 })
}
