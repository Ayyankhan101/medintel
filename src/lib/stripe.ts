import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    // Pin the API version so subscription/invoice payload shapes stay stable
    // regardless of the account's default API version in the Stripe dashboard.
    // Bump this together with the `stripe` package; payload shapes (e.g.
    // `current_period_end` moving from Subscription onto SubscriptionItem)
    // change between major versions.
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  }
  return _stripe
}

// Named export alias for route handlers that import `stripe` directly
export { getStripe as stripe }

// PKR is a zero-decimal currency in Stripe — 1500 PKR is sent as `1500`, not `150000`.
// See: https://stripe.com/docs/currencies#zero-decimal
export function formatAmountForStripe(amount: number): number {
  return Math.round(amount)
}

export function formatAmountFromStripe(units: number): number {
  return units
}

/** True when the cron should auto-refund a no-show: appointment still SCHEDULED
 *  and the start time is more than `graceHours` in the past. */
export function isNoShowRefundEligible(
  scheduledAt: Date,
  status: string,
  graceHours = 2
): boolean {
  if (status !== 'SCHEDULED') return false
  const graceMs = graceHours * 60 * 60 * 1000
  return Date.now() - scheduledAt.getTime() > graceMs
}

/** True when a patient can cancel + refund their own booking. Allowed any time
 *  the appointment is still SCHEDULED (pre-start) OR satisfies the no-show
 *  grace window after the doctor failed to show. */
export function isPatientRefundEligible(
  scheduledAt: Date,
  status: string,
  graceHours = 2
): boolean {
  if (status !== 'SCHEDULED') return false
  // Pre-appointment: free cancel.
  if (Date.now() < scheduledAt.getTime()) return true
  // Post-appointment: only after grace (doctor no-show).
  return isNoShowRefundEligible(scheduledAt, status, graceHours)
}

/** @deprecated use `isNoShowRefundEligible` or `isPatientRefundEligible`. */
export const isAutoRefundEligible = isNoShowRefundEligible

/**
 * Platform fee in basis points (1000 = 10%). The doctor receives the rest.
 * Configurable via env so we can run promos / per-region pricing later.
 */
export const PLATFORM_FEE_BPS = (() => {
  const raw = Number(process.env.PLATFORM_FEE_BPS)
  return Number.isFinite(raw) && raw >= 0 && raw <= 10_000 ? raw : 1_000
})()

export function platformFeeFor(amount: number): number {
  return Math.floor(formatAmountForStripe(amount) * PLATFORM_FEE_BPS / 10_000)
}

export async function createEscrowPaymentIntent(
  amount: number,
  doctorStripeAccountId: string,
  appointmentId: string,
  currency = 'pkr'
): Promise<Stripe.PaymentIntent> {
  // Use `transfer_data.destination` + `application_fee_amount` so capture
  // splits the funds atomically. No separate `transfers.create` call to fail
  // halfway through. Refunds with `reverse_transfer: true` reverse the doctor's
  // share automatically; `refund_application_fee: true` reverses ours.
  return getStripe().paymentIntents.create({
    amount: formatAmountForStripe(amount),
    currency,
    capture_method:         'manual',
    application_fee_amount: platformFeeFor(amount),
    transfer_data:          { destination: doctorStripeAccountId },
    on_behalf_of:           doctorStripeAccountId,
    metadata: { appointmentId, doctorStripeAccountId },
    description: `MedIntel Consultation — Appointment ${appointmentId}`,
  })
}

export async function releaseEscrowToDoctor(
  paymentIntentId: string,
  doctorStripeAccountId: string,
  amount: number,
  currency = 'pkr'
): Promise<void> {
  const stripe = getStripe()
  // Detect legacy PIs created before we switched to transfer_data + application_fee.
  // Those need the old capture-then-transfer flow; new ones split atomically at capture.
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  const hasTransferData = !!pi.transfer_data?.destination

  await stripe.paymentIntents.capture(paymentIntentId)

  if (!hasTransferData) {
    // Legacy path: manually transfer the doctor's share off the platform balance.
    const doctorAmount = formatAmountForStripe(amount) - platformFeeFor(amount)
    await stripe.transfers.create({
      amount:             doctorAmount,
      currency,
      destination:        doctorStripeAccountId,
      source_transaction: pi.latest_charge as string,
    })
  }
}

export async function refundEscrow(paymentIntentId: string): Promise<void> {
  await getStripe().paymentIntents.cancel(paymentIntentId)
}

/**
 * Refund a (potentially already-captured/released) escrow. Handles:
 *
 *  - HELD (uncaptured): cancel the PaymentIntent (same as refundEscrow)
 *  - RELEASED (captured + transferred): create a partial/full refund and
 *    reverse the transfer so the doctor's share is clawed back proportionally
 *
 * `amount` is in PKR (zero-decimal). Pass undefined for a full refund.
 */
export async function refundCapturedEscrow(
  paymentIntentId: string,
  amount?: number,
): Promise<{ refundId: string; amount: number }> {
  const refund = await getStripe().refunds.create({
    payment_intent:   paymentIntentId,
    ...(amount ? { amount: formatAmountForStripe(amount) } : {}),
    reverse_transfer: true,
    refund_application_fee: true,
  })
  return { refundId: refund.id, amount: refund.amount }
}
