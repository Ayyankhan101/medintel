import type {
  PaymentProvider, CheckoutInput, CheckoutResult,
  CaptureInput, RefundInput, RefundResult, NormalizedEvent,
} from './types'
import { createEscrowPaymentIntent, releaseEscrowToDoctor, refundEscrow } from '@/lib/stripe'

export const stripeProvider: PaymentProvider = {
  id: 'stripe',

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const pi = await createEscrowPaymentIntent(input.amount, input.doctorAccountId, input.appointmentId)
    return { providerRef: pi.id, kind: 'client_secret', clientSecret: pi.client_secret! }
  },

  async capture(input: CaptureInput): Promise<void> {
    await releaseEscrowToDoctor(input.providerRef, input.doctorAccountId, input.amount)
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    await refundEscrow(input.providerRef)
    return { refundRef: `stripe_cancel_${input.providerRef}`, amount: input.amount ?? 0 }
  },

  async verifyWebhook(_rawBody: string, _headers: Headers): Promise<NormalizedEvent> {
    throw new Error('Stripe webhooks are handled by /api/payments/stripe/webhook — not routed here')
  },
}
