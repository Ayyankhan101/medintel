/**
 * Stripe webhook.
 *
 * Handles:
 *   - payment_intent.payment_failed         → cancel the appointment
 *   - checkout.session.completed (mode=subscription)
 *                                           → link clinic ↔ subscription, set plan
 *   - invoice.paid                          → reset minutesUsed = 0, bump currentPeriodEnd
 *   - customer.subscription.updated         → plan/quota sync (e.g. customer-portal upgrades)
 *   - customer.subscription.deleted         → revert clinic to STARTER + free quota
 *   - charge.refunded                       → reconcile out-of-band refunds
 *                                             (admin clicking Refund in the Stripe dashboard)
 */
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { PLAN_QUOTA, planFromPriceId, type Plan } from '@/lib/clinic'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  // Idempotency: Stripe retries on non-2xx and can redeliver successful events
  // too. Insert on the unique `eventId` PK — P2002 means already processed.
  try {
    await prisma.processedStripeEvent.create({ data: { eventId: event.id, type: event.type } })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('[stripe-webhook] dedupe insert failed', e)
    // Fall through — better to risk re-processing than to drop the event.
  }

  try {
    switch (event.type) {
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const appointmentId = pi.metadata.appointmentId
        if (appointmentId) {
          await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED' } })
        }
        break
      }

      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        if (s.mode !== 'subscription' || !s.subscription || !s.customer) break

        const clinicId = (s.metadata?.clinicId ?? '') as string
        const plan     = (s.metadata?.plan as Plan | undefined) ?? null
        if (!clinicId || !plan) break

        const customerId     = typeof s.customer     === 'string' ? s.customer     : s.customer.id
        const subscriptionId = typeof s.subscription === 'string' ? s.subscription : s.subscription.id

        await prisma.clinic.update({
          where: { id: clinicId },
          data: {
            plan,
            minutesQuota:         PLAN_QUOTA[plan],
            minutesUsed:          0,
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subscriptionId,
            active:               true,
          },
        })
        void audit('clinic.subscription_start', 'Clinic', clinicId, { plan, subscriptionId })
        break
      }

      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        // Stripe API 2026-04 (dahlia): the subscription pointer moved from
        // `invoice.subscription` onto `invoice.parent.subscription_details.subscription`.
        // Fall back to the line item's subscription id for older accounts that
        // still emit the legacy shape, and finally to the deprecated top-level
        // field so historical replays keep working.
        const parentSubRef = inv.parent?.type === 'subscription_details'
          ? inv.parent.subscription_details?.subscription
          : null
        const lineSubRef = (inv.lines.data[0] as { subscription?: string | { id: string } | null } | undefined)?.subscription
        const legacy     = (inv as unknown as { subscription?: string | { id: string } | null }).subscription
        const subRef     = parentSubRef ?? lineSubRef ?? legacy
        const subId      = typeof subRef === 'string' ? subRef : subRef?.id
        if (!subId) break
        const clinic = await prisma.clinic.findFirst({ where: { stripeSubscriptionId: subId } })
        if (!clinic) break
        const periodEnd = inv.lines.data[0]?.period?.end ?? null
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: {
            minutesUsed:      0,
            quotaAlertLevel:  0,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            active:           true,
          },
        })
        void audit('clinic.invoice_paid', 'Clinic', clinic.id, { invoiceId: inv.id, amount: inv.amount_paid })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price?.id
        const plan = planFromPriceId(priceId)
        const clinic = await prisma.clinic.findFirst({ where: { stripeSubscriptionId: sub.id } })
        if (!clinic) break
        // Stripe API 2026-04 (dahlia): `current_period_end` moved off the
        // Subscription object and onto each SubscriptionItem. With mixed-cadence
        // items this can differ per row; for our single-item subscriptions we
        // take the max so the clinic doesn't expire mid-cycle.
        const periodEnd = Math.max(
          0,
          ...sub.items.data.map(i => i.current_period_end ?? 0),
          // Fallback for replays of pre-dahlia events still carrying the legacy field.
          (sub as unknown as { current_period_end?: number }).current_period_end ?? 0,
        )
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: {
            ...(plan ? { plan, minutesQuota: PLAN_QUOTA[plan] } : {}),
            currentPeriodEnd: periodEnd > 0 ? new Date(periodEnd * 1000) : undefined,
            active:           sub.status === 'active' || sub.status === 'trialing',
          },
        })
        void audit('clinic.subscription_update', 'Clinic', clinic.id, { plan, status: sub.status })
        break
      }

      case 'charge.refunded': {
        // Out-of-band refund: admin pressed "Refund" in Stripe dashboard, or our
        // own refund call landed an async event back here. Idempotent: only flips
        // state if escrow is still HELD/RELEASED.
        const charge = event.data.object as Stripe.Charge
        const piId   = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (!piId) break

        const escrow = await prisma.escrow.findUnique({
          where:   { stripePaymentIntentId: piId },
          include: { appointment: true },
        })
        if (!escrow || escrow.status === 'REFUNDED') break

        await prisma.$transaction([
          prisma.escrow.update({
            where: { id: escrow.id },
            data:  { status: 'REFUNDED', refundedAt: new Date(), refundReason: escrow.refundReason ?? 'Stripe dashboard refund' },
          }),
          prisma.appointment.update({
            where: { id: escrow.appointmentId },
            data:  {
              status:             'REFUNDED',
              cancelledAt:        escrow.appointment.cancelledAt ?? new Date(),
              cancelledBy:        escrow.appointment.cancelledBy ?? 'ADMIN',
              cancellationReason: escrow.appointment.cancellationReason ?? 'Refunded via Stripe dashboard',
            },
          }),
        ])
        void audit('escrow.refund_reconcile', 'Appointment', escrow.appointmentId, {
          chargeId: charge.id, amount: charge.amount_refunded,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const clinic = await prisma.clinic.findFirst({ where: { stripeSubscriptionId: sub.id } })
        if (!clinic) break
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: {
            plan:                 'STARTER',
            minutesQuota:         PLAN_QUOTA.STARTER,
            stripeSubscriptionId: null,
            currentPeriodEnd:     null,
            active:               true, // keep them on the free tier
          },
        })
        void audit('clinic.subscription_cancel', 'Clinic', clinic.id, {})
        break
      }
    }
  } catch (e) {
    console.error('[stripe-webhook] handler error', { type: event.type, e })
    // Roll back the dedupe row so Stripe's retry actually re-runs the handler.
    await prisma.processedStripeEvent.delete({ where: { eventId: event.id } }).catch(() => {})
    // Returning 500 makes Stripe retry — desirable for transient DB errors.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
