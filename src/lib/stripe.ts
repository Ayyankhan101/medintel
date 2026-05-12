import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
  }
  return _stripe
}

// Named export alias for route handlers that import `stripe` directly
export { getStripe as stripe }

export function formatAmountForStripe(dollarAmount: number): number {
  return Math.round(dollarAmount * 100)
}

export function formatAmountFromStripe(cents: number): number {
  return cents / 100
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
  amountDollars: number,
  doctorStripeAccountId: string,
  appointmentId: string,
  currency = 'usd'
): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.create({
    amount: formatAmountForStripe(amountDollars),
    currency,
    capture_method: 'manual',
    metadata: { appointmentId, doctorStripeAccountId },
    description: `MedIntel Consultation — Appointment ${appointmentId}`,
  })
}

export async function releaseEscrowToDoctor(
  paymentIntentId: string,
  doctorStripeAccountId: string,
  amountDollars: number
): Promise<void> {
  await getStripe().paymentIntents.capture(paymentIntentId)

  const doctorAmount = Math.floor(formatAmountForStripe(amountDollars) * 0.9)
  await getStripe().transfers.create({
    amount: doctorAmount,
    currency: 'usd',
    destination: doctorStripeAccountId,
    source_transaction: paymentIntentId,
  })
}

export async function refundEscrow(paymentIntentId: string): Promise<void> {
  await getStripe().paymentIntents.cancel(paymentIntentId)
}
