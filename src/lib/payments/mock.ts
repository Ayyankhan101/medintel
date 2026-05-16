/**
 * Mock payment provider — for local dev and the demo when no real PSP is wired.
 *
 * `createCheckout` returns a redirect to an in-app page (`/mock-pay/[ref]`)
 * that just shows "Pay" + "Cancel" buttons. Clicking "Pay" POSTs to
 * `/api/payments/mock/complete` which writes the equivalent of the SafePay
 * `payment.succeeded` event. Useful so the entire booking → consult → release
 * flow can be exercised end-to-end with zero PSP setup.
 */

import { randomBytes } from 'node:crypto'
import type {
  PaymentProvider, CheckoutInput, CheckoutResult,
  CaptureInput, RefundInput, RefundResult, NormalizedEvent,
} from './types'

const APP_URL = () => process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

export const mockProvider: PaymentProvider = {
  id: 'mock',

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const ref = `mock_${randomBytes(8).toString('hex')}`
    const u = new URL(`/mock-pay/${ref}`, APP_URL())
    u.searchParams.set('amount',        String(input.amount))
    u.searchParams.set('appointmentId', input.appointmentId)
    u.searchParams.set('successUrl',    input.successUrl)
    u.searchParams.set('cancelUrl',     input.cancelUrl)
    return { providerRef: ref, kind: 'redirect', redirectUrl: u.toString() }
  },

  async capture(_input: CaptureInput): Promise<void> {
    return
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    return { refundRef: `mock_refund_${randomBytes(6).toString('hex')}`, amount: input.amount ?? 0 }
  },

  async verifyWebhook(rawBody: string): Promise<NormalizedEvent> {
    const event = JSON.parse(rawBody) as {
      eventId?:      string
      type?:         NormalizedEvent['type']
      appointmentId?: string
      providerRef?:  string
      amount?:       number
    }
    return {
      eventId:       event.eventId ?? `mock-${Date.now()}`,
      type:          event.type ?? 'payment.succeeded',
      appointmentId: event.appointmentId,
      providerRef:   event.providerRef,
      amount:        event.amount,
      raw:           event,
    }
  },
}
