/**
 * Provider-agnostic payment interface.
 *
 * Goal: a route like `/api/escrow/create` shouldn't know whether the money is
 * flowing through Stripe, SafePay, JazzCash, or a mock provider. Each adapter
 * implements this surface; the route picks one via `pickProvider()`.
 *
 * Concepts:
 *  - "checkout" — the patient-facing payment step. Returns a redirect URL or
 *    a client-secret depending on the provider.
 *  - "capture" — release the held funds to the doctor (escrow → released).
 *    For providers that don't support manual-capture, this is a no-op after
 *    the original auth completed (we still record the state transition).
 *  - "refund" — full or partial refund. Supports `reverse_transfer` semantics
 *    where the provider has a marketplace model.
 *  - "verifyWebhook" — signature-verify an inbound webhook + return the event
 *    in a normalized shape the route can switch on.
 */

export type ProviderId = 'stripe' | 'safepay' | 'mock'

export interface CheckoutInput {
  /** PKR amount (whole rupees). */
  amount:          number
  /** Internal appointment ID (round-trips in metadata + webhook). */
  appointmentId:   string
  /** Doctor's payout account ID for the provider, when split-on-capture is used. */
  doctorAccountId: string
  /** Where the patient lands after a successful checkout. */
  successUrl:      string
  /** Where they land if they bail. */
  cancelUrl:       string
  /** Patient email for receipts (optional). */
  patientEmail?:   string
}

export interface CheckoutResult {
  /** Provider's payment intent / order ID — persist in Escrow.providerRef. */
  providerRef: string
  /**
   * One of:
   *   - `redirect`: send the patient to `redirectUrl` (hosted checkout, e.g. SafePay)
   *   - `client_secret`: render Stripe Elements with this secret
   *   - `instant`: already paid (e.g. wallet-balance providers)
   */
  kind:         'redirect' | 'client_secret' | 'instant'
  redirectUrl?: string
  clientSecret?: string
}

export interface CaptureInput {
  providerRef:    string
  amount:         number
  doctorAccountId: string
}

export interface RefundInput {
  providerRef: string
  /** PKR. Omit for full refund. */
  amount?: number
  /** Reason recorded with the provider where supported. */
  reason?: string
}

export interface RefundResult {
  refundRef: string
  amount:    number
}

export interface NormalizedEvent {
  /** Provider's event id (use for idempotency). */
  eventId: string
  /** A small set of shapes the app cares about. */
  type:
    | 'payment.succeeded'
    | 'payment.failed'
    | 'payment.refunded'
    | 'unknown'
  appointmentId?: string
  providerRef?:   string
  amount?:        number
  raw?:           unknown
}

export interface PaymentProvider {
  id: ProviderId
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>
  capture(input: CaptureInput):           Promise<void>
  refund(input: RefundInput):             Promise<RefundResult>
  verifyWebhook(rawBody: string, headers: Headers): Promise<NormalizedEvent>
}
