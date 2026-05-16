/**
 * SafePay adapter — Pakistan-local PSP routing cards, JazzCash, EasyPaisa,
 * NayaPay, SadaPay, and bank-transfer under one hosted checkout.
 *
 * Docs (sandbox): https://safepay.dev/docs/integrations/api-reference
 *
 * Env (single source of truth):
 *   SAFEPAY_ENV            — 'sandbox' | 'production' (default 'sandbox')
 *   SAFEPAY_API_KEY        — sent as Authorization Bearer
 *   SAFEPAY_SECRET_KEY     — HMAC-SHA256 webhook secret (fallback)
 *   SAFEPAY_WEBHOOK_SECRET — preferred webhook secret if SafePay rotates it
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

type SafePayEnv = 'sandbox' | 'production'
const RAW_ENV = process.env.SAFEPAY_ENV
if (RAW_ENV && RAW_ENV !== 'sandbox' && RAW_ENV !== 'production') {
  console.warn(
    `[safepay] Ignoring unrecognized SAFEPAY_ENV=${JSON.stringify(RAW_ENV)}, ` +
    `defaulting to 'sandbox'. Valid values: 'sandbox' | 'production'.`,
  )
}
const ENV: SafePayEnv = RAW_ENV === 'production' ? 'production' : 'sandbox'

// Per-env base + checkout endpoints. Production has no `api.` subdomain so
// previous `BASE.replace('api.','')` trick silently produced a broken URL —
// keep them as explicit constants instead.
const ENDPOINTS = {
  sandbox: {
    api:      'https://sandbox.api.getsafepay.com',
    checkout: 'https://sandbox.getsafepay.com/checkout',
  },
  production: {
    api:      'https://getsafepay.com/api',
    checkout: 'https://getsafepay.com/checkout',
  },
} as const

const BASE         = ENDPOINTS[ENV].api
const CHECKOUT_URL = ENDPOINTS[ENV].checkout

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
      environment:     ENV,
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
    const u = new URL(CHECKOUT_URL)
    u.searchParams.set('tracker', tracker)
    u.searchParams.set('source',  'custom')
    u.searchParams.set('redirect_url', input.successUrl)
    u.searchParams.set('cancel_url',   input.cancelUrl)
    if (input.patientEmail) u.searchParams.set('email', input.patientEmail)

    return { providerRef: tracker, kind: 'redirect', redirectUrl: u.toString() }
  },

  async capture(_input: CaptureInput): Promise<void> {
    // SafePay captures synchronously at checkout, so no capture API call is
    // needed — BUT the release-to-doctor flow in lib/stripe.ts assumes this
    // method also moves funds to the doctor (transfer_data semantics). For
    // SafePay we need a separate disbursement call that does not exist yet.
    // Fail loud rather than silently succeeding so we don't ship a "doctors
    // never paid" bug to prod.
    throw new Error(
      'SafePay disbursement not yet implemented. Wire lib/payouts before ' +
      'calling capture() on a SafePay-held escrow.',
    )
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
    // SHA256 = 32 bytes = 64 hex chars. Reject odd-length/short hex up front
    // so `Buffer.from(sig, 'hex')` can't silently truncate a malformed sig
    // into one that happens to share leading bytes with the real digest.
    if (!/^[0-9a-f]{64}$/i.test(sig)) throw new Error('SafePay webhook signature invalid')
    // Compare raw bytes, not utf8 hex strings: lets us tolerate case
    // differences and catches truncation / encoding drift early.
    const a = Buffer.from(sig, 'hex')
    const b = createHmac('sha256', secret).update(rawBody).digest()
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
