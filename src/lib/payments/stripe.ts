import type {
  PaymentProvider, CheckoutInput, CheckoutResult,
  CaptureInput, RefundInput, RefundResult, NormalizedEvent,
} from './types'
import { createEscrowPaymentIntent, releaseEscrowToDoctor, refundEscrow } from '@/lib/stripe'

export const stripeProvider: PaymentProvider = {
  id: 'stripe',

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const pi = await createEscrowPaymentIntent(input.amount, input.doctorAccountId, input.appointmentId)
    if (!pi.client_secret) throw new Error(`Stripe PI ${pi.id} has no client_secret`)
    return { providerRef: pi.id, kind: 'client_secret', clientSecret: pi.client_secret }
  },

  async capture(input: CaptureInput): Promise<void> {
    await releaseEscrowToDoctor(input.providerRef, input.doctorAccountId, input.amount)
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    // Only valid for uncaptured (HELD) PIs. Captured PIs need refundCapturedEscrow instead.
    // PI cancel does not return the refunded amount; callers must supply it via input.amount.
    await refundEscrow(input.providerRef)
    return { refundRef: `stripe_cancel_${input.providerRef}`, amount: input.amount! }
  },

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<NormalizedEvent> {
    throw new Error('Stripe webhooks are handled by /api/payments/stripe/webhook — not routed here')
  },
}
