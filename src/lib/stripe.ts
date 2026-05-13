import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
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

export function isAutoRefundEligible(
  scheduledAt: Date,
  status: string,
  graceHours = 2
): boolean {
  if (status !== 'SCHEDULED') return false
  const graceMs = graceHours * 60 * 60 * 1000
  return Date.now() - scheduledAt.getTime() > graceMs
}

export async function createEscrowPaymentIntent(
  amount: number,
  doctorStripeAccountId: string,
  appointmentId: string,
  currency = 'pkr'
): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.create({
    amount: formatAmountForStripe(amount),
    currency,
    capture_method: 'manual',
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
  await getStripe().paymentIntents.capture(paymentIntentId)

  const doctorAmount = Math.floor(formatAmountForStripe(amount) * 0.9)
  await getStripe().transfers.create({
    amount: doctorAmount,
    currency,
    destination: doctorStripeAccountId,
    source_transaction: paymentIntentId,
  })
}

export async function refundEscrow(paymentIntentId: string): Promise<void> {
  await getStripe().paymentIntents.cancel(paymentIntentId)
}
