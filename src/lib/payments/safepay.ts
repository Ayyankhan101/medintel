/**
 * SafePay adapter — Pakistan-local PSP routing cards, JazzCash, EasyPaisa,
 * NayaPay, SadaPay, and bank-transfer under one hosted checkout.
 *
 * Docs (sandbox): https://safepay.dev/docs/integrations/api-reference
 * Sandbox base:    https://sandbox.api.getsafepay.com
 * Production base: https://getsafepay.com/api
 *
 * Env:
 *   SAFEPAY_API_KEY      — public key (sent as Authorization)
 *   SAFEPAY_SECRET_KEY   — used to HMAC-SHA256 webhook bodies
 *   SAFEPAY_BASE_URL     — override (defaults to sandbox)
 *   SAFEPAY_WEBHOOK_SECRET — separate webhook secret if SafePay rotates it
 *
 * NOTE: We don't have live SafePay credentials wired yet. This adapter targets
 * the real REST contract so swapping in a live key flips it from mocked-by-env
 * to live. When `SAFEPAY_API_KEY` is unset, the adapter falls back to the
 * `mock` provider behavior — useful for the demo flow.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  PaymentProvider, CheckoutInput, CheckoutResult,
  CaptureInput, RefundInput, RefundResult, NormalizedEvent,
} from './types'

const BASE = process.env.SAFEPAY_BASE_URL ?? 'https://sandbox.api.getsafepay.com'

function authHeaders(): Record<string, string> {
  return {
    'content-type':  'application/json',
    'authorization': `Bearer ${process.env.SAFEPAY_API_KEY ?? ''}`,
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SafePay ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

interface TrackerCreateResp { data: { token: string; tracker: string } }

export const safepayProvider: PaymentProvider = {
  id: 'safepay',

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    // SafePay's "tracker" is their PaymentIntent equivalent. The browser then
    // redirects to their hosted checkout with the tracker token. After payment,
    // the user is sent back to `successUrl` with `tracker` in the query.
    const body = {
      amount:          input.amount,
      currency:        'PKR',
      environment:     process.env.SAFEPAY_API_KEY?.startsWith('sec_live_') ? 'production' : 'sandbox',
      source:          'custom',
      order_id:        input.appointmentId,
      // Custom metadata round-trips back to us in the webhook.
      custom_data: {
        appointmentId:   input.appointmentId,
        doctorAccountId: input.doctorAccountId,
      },
      // The doctor's account is informational only here; SafePay doesn't do
      // marketplace split-on-capture. Disbursement happens via a separate
      // payout API (see lib/payouts) after we capture.
    }
    const resp = await api<TrackerCreateResp>('/order/v1/init', {
      method: 'POST',
      body:   JSON.stringify(body),
    })
    const tracker = resp.data.tracker
    const u = new URL('/checkout', BASE.replace('api.', ''))
    u.searchParams.set('tracker', tracker)
    u.searchParams.set('source',  'custom')
    u.searchParams.set('redirect_url', input.successUrl)
    u.searchParams.set('cancel_url',   input.cancelUrl)
    if (input.patientEmail) u.searchParams.set('email', input.patientEmail)

    return { providerRef: tracker, kind: 'redirect', redirectUrl: u.toString() }
  },

  async capture(_input: CaptureInput): Promise<void> {
    // SafePay captures synchronously at checkout — no separate capture step.
    // The escrow "held → released" transition is enforced at the application
    // layer (release route flips the row; we only call out to disbursement
    // when we actually want to pay the doctor).
    return
  },

  async refund(input: RefundInput): Promise<RefundResult> {
    const body = {
      tracker: input.providerRef,
      ...(input.amount ? { amount: input.amount } : {}),
      reason:  input.reason ?? 'patient_request',
    }
    const resp = await api<{ data: { refund_id: string; amount: number } }>(
      '/order/v1/refund',
      { method: 'POST', body: JSON.stringify(body) },
    )
    return { refundRef: resp.data.refund_id, amount: resp.data.amount }
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<NormalizedEvent> {
    const secret = process.env.SAFEPAY_WEBHOOK_SECRET ?? process.env.SAFEPAY_SECRET_KEY
    const sig    = headers.get('x-safepay-signature') ?? ''
    if (!secret) throw new Error('SAFEPAY_WEBHOOK_SECRET not configured')
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error('SafePay webhook signature invalid')
    }
    const event = JSON.parse(rawBody) as {
      id?:           string
      type?:         string
      data?:         { tracker?: string; amount?: number; custom_data?: { appointmentId?: string } }
    }
    const typeMap: Record<string, NormalizedEvent['type']> = {
      'order.completed': 'payment.succeeded',
      'order.failed':    'payment.failed',
      'order.refunded':  'payment.refunded',
    }
    return {
      eventId:       event.id ?? `safepay-${Date.now()}`,
      type:          typeMap[event.type ?? ''] ?? 'unknown',
      providerRef:   event.data?.tracker,
      appointmentId: event.data?.custom_data?.appointmentId,
      amount:        event.data?.amount,
      raw:           event,
    }
  },
}
