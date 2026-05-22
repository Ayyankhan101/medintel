import type {
  PaymentProvider, CheckoutInput, CheckoutResult,
  CaptureInput, RefundInput, RefundResult, NormalizedEvent,
} from './types'
import { createEscrowPaymentIntent, releaseEscrowToDoctor, refundEscrow, refundCapturedEscrow } from '@/lib/stripe'

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
    // Uncaptured (HELD) PI — cancel the authorisation.
    await refundEscrow(input.providerRef)
    return { refundRef: `stripe_cancel_${input.providerRef}`, amount: input.amount! }
  },

  async refundCaptured(input: RefundInput): Promise<RefundResult> {
    // Captured (RELEASED) PI — create a refund and reverse the transfer.
    const { refundId, amount } = await refundCapturedEscrow(input.providerRef, input.amount)
    return { refundRef: refundId, amount }
  },

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<NormalizedEvent> {
    throw new Error('Stripe webhooks are handled by /api/payments/stripe/webhook — not routed here')
  },
}
