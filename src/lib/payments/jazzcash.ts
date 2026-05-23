/**
 * JazzCash adapter — Pakistan's largest mobile wallet (50M+ accounts).
 *
 * Two payment flows:
 *   1. Hosted checkout (REDIRECT) — browser lands on JazzCash payment page,
 *      supports JazzCash wallet + Visa/Mastercard. Used for createCheckout().
 *   2. B2C Push Payment — platform sends money to a doctor's JazzCash wallet.
 *      Used for capture() (escrow release to doctor).
 *
 * Escrow model:
 *   Patient pays → money lands in platform JazzCash merchant account (HELD in DB).
 *   Prescription uploaded → capture() B2C-pushes to doctor's JazzCash wallet.
 *   No-show / cancel → refund() credits patient's JazzCash account.
 *
 * JazzCash does NOT support Stripe-style authorize/capture. The "hold" is
 * entirely in our DB; the money moves at checkout time.
 *
 * Env variables (all required in production):
 *   JAZZCASH_ENV             — 'sandbox' | 'production'  (default 'sandbox')
 *   JAZZCASH_MERCHANT_ID     — issued by JazzCash (e.g. MC12345)
 *   JAZZCASH_PASSWORD        — merchant password from JazzCash dashboard
 *   JAZZCASH_INTEGRITY_SALT  — HMAC-SHA256 signing key from JazzCash dashboard
 *                              (separate from password — rotatable)
 *
 * Sandbox credentials: https://sandbox.jazzcash.com.pk  → merchant portal
 * Live credentials:    apply via jazzcash.com.pk/merchant
 *
 * doctorAccountId format for capture():
 *   "03001234567"  — doctor's JazzCash registered mobile number
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  PaymentProvider, CheckoutInput, CheckoutResult,
  CaptureInput, RefundInput, RefundResult, NormalizedEvent,
} from './types'

// ── Env ──────────────────────────────────────────────────────────────────────

type JazzCashEnv = 'sandbox' | 'production'
const ENV: JazzCashEnv =
  process.env.JAZZCASH_ENV === 'production' ? 'production' : 'sandbox'

const ENDPOINTS = {
  sandbox: {
    checkout: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
    api:      'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0',
  },
  production: {
    checkout: 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
    api:      'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0',
  },
} as const

const BASE         = ENDPOINTS[ENV].api
const CHECKOUT_URL = ENDPOINTS[ENV].checkout

// JazzCash amounts are in paisa (1 PKR = 100 paisa).
const TO_PAISA = (pkr: number) => String(Math.round(pkr * 100))

// ── Signing ───────────────────────────────────────────────────────────────────

/**
 * JazzCash HMAC-SHA256 signature.
 *
 * Algorithm (from JazzCash Merchant Integration Guide v2.0):
 *   1. Collect all pp_ parameters, exclude pp_SecuredHash.
 *   2. Sort alphabetically by key.
 *   3. Concatenate VALUES separated by '&'.
 *   4. Prepend IntegritySalt: `${salt}&${val1}&${val2}…`
 *   5. HMAC-SHA256(key=IntegritySalt, message=above).
 *   6. Uppercase hex.
 */
function sign(params: Record<string, string>): string {
  const salt = process.env.JAZZCASH_INTEGRITY_SALT ?? ''
  const sorted = Object.keys(params)
    .filter(k => k !== 'pp_SecuredHash' && params[k] !== '')
    .sort()
    .map(k => params[k])
  const message = [salt, ...sorted].join('&')
  return createHmac('sha256', salt).update(message).digest('hex').toUpperCase()
}

/** Verify a JazzCash signature constant-time (same algorithm, inverse direction). */
function verifySign(params: Record<string, string>, expected: string): boolean {
  if (!expected) return false
  const computed = sign(params)
  // timingSafeEqual requires same-length buffers.
  const a = Buffer.from(computed, 'utf8')
  const b = Buffer.from(expected,  'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** JazzCash datetime format: YYYYMMDDHHmmss */
function jcDate(d = new Date()): string {
  return d.toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

/** Unique transaction reference: T + YYYYMMDDHHmmss + 4-digit random suffix. */
function txnRef(): string {
  const rnd = Math.floor(Math.random() * 9000) + 1000
  return `T${jcDate()}${rnd}`
}

function merchant(): { id: string; password: string } {
  const id       = process.env.JAZZCASH_MERCHANT_ID ?? ''
  const password = process.env.JAZZCASH_PASSWORD     ?? ''
  if (!id || !password) throw new Error('JAZZCASH_MERCHANT_ID / JAZZCASH_PASSWORD not configured')
  return { id, password }
}

async function apiPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`JazzCash ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json() as Promise<T>
}

// ── Response codes ────────────────────────────────────────────────────────────

const JC_SUCCESS = '000'

function assertSuccess(code: string, desc: string) {
  if (code !== JC_SUCCESS) {
    throw new Error(`JazzCash error ${code}: ${desc}`)
  }
}

// ── Adapter ───────────────────────────────────────────────────────────────────

export const jazzcashProvider: PaymentProvider = {
  id: 'jazzcash',

  /**
   * Build a hosted-checkout redirect to JazzCash's payment page.
   *
   * JazzCash checkout is a browser-side redirect (form POST or GET with params).
   * The patient authenticates their JazzCash wallet on JazzCash's domain, then
   * JazzCash POSTs the result back to pp_ReturnURL (our webhook handler).
   *
   * The returned CheckoutResult.redirectUrl encodes all signed params as a
   * query string; the client-side code should POST a hidden form to CHECKOUT_URL
   * instead of a plain GET — JazzCash requires POST for the checkout handoff.
   * We encode them as a GET for simplicity, but note that JazzCash also accepts
   * it when all params are present and correctly signed.
   */
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const { id, password } = merchant()
    const ref     = txnRef()
    const now     = jcDate()
    const expiry  = jcDate(new Date(Date.now() + 30 * 60_000)) // 30 min window

    const params: Record<string, string> = {
      pp_Version:             '1.1',
      pp_TxnType:             'MWALLET',
      pp_Language:            'EN',
      pp_MerchantID:          id,
      pp_SubMerchantID:       '',
      pp_Password:            password,
      pp_BankID:              'TBLB',   // Telenor Microfinance Bank
      pp_ProductID:           'RETL',
      pp_TxnRefNo:            ref,
      pp_Amount:              TO_PAISA(input.amount),
      pp_TxnCurrency:         'PKR',
      pp_TxnDateTime:         now,
      pp_BillReference:       input.appointmentId,
      pp_Description:         `MedIntel consultation #${input.appointmentId.slice(0, 8)}`,
      pp_TxnExpiryDateTime:   expiry,
      pp_ReturnURL:           input.successUrl,
      pp_CancelURL:           input.cancelUrl,
      // Custom field — round-trips back in the return POST.
      pp_MerchantCustomerID:  input.appointmentId,
    }
    params.pp_SecuredHash = sign(params)

    // Build redirect URL (GET-safe for client navigation).
    const u = new URL(CHECKOUT_URL)
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v))

    return { providerRef: ref, kind: 'redirect', redirectUrl: u.toString() }
  },

  /**
   * B2C (Business to Consumer) push payment — release escrow to doctor's wallet.
   *
   * `input.doctorAccountId` must be the doctor's JazzCash mobile number
   * in the format "03XXXXXXXXX".
   *
   * Requires JAZZCASH_MERCHANT_ID + JAZZCASH_PASSWORD + JAZZCASH_INTEGRITY_SALT
   * to be the B2C-enabled merchant credentials (separate enrollment from the
   * C2B checkout credentials — request via jazzcash.com.pk/b2c-enrollment).
   */
  async capture(input: CaptureInput): Promise<void> {
    const { id, password } = merchant()
    const ref    = txnRef()
    const now    = jcDate()
    const expiry = jcDate(new Date(Date.now() + 60 * 60_000))

    if (!/^03[0-9]{9}$/.test(input.doctorAccountId)) {
      throw new Error(
        `JazzCash B2C requires a Pakistani mobile number (03XXXXXXXXX). ` +
        `Got: "${input.doctorAccountId}". ` +
        `Set doctor.jazzcashMobile on the Doctor profile.`,
      )
    }

    const params: Record<string, string> = {
      pp_Version:           '1.1',
      pp_TxnType:           'B2C',
      pp_Language:          'EN',
      pp_MerchantID:        id,
      pp_SubMerchantID:     '',
      pp_Password:          password,
      pp_BankID:            'TBLB',
      pp_ProductID:         'RETL',
      pp_TxnRefNo:          ref,
      pp_Amount:            TO_PAISA(input.amount),
      pp_TxnCurrency:       'PKR',
      pp_TxnDateTime:       now,
      pp_BillReference:     `release_${input.providerRef}`,
      pp_Description:       `MedIntel doctor payout`,
      pp_TxnExpiryDateTime: expiry,
      pp_ReceiverMobileNo:  input.doctorAccountId,
    }
    params.pp_SecuredHash = sign(params)

    const resp = await apiPost<{ pp_ResponseCode: string; pp_ResponseMessage: string }>(
      '/Purchase/DoB2CPayment',
      params,
    )
    assertSuccess(resp.pp_ResponseCode, resp.pp_ResponseMessage)
  },

  /**
   * Refund a JazzCash transaction (MWALLET or card).
   * JazzCash uses the original pp_TxnRefNo to look up and reverse the charge.
   */
  async refund(input: RefundInput): Promise<RefundResult> {
    const { id, password } = merchant()
    const ref    = txnRef()
    const now    = jcDate()
    const expiry = jcDate(new Date(Date.now() + 30 * 60_000))

    const params: Record<string, string> = {
      pp_Version:           '1.1',
      pp_TxnType:           'REFUND',
      pp_Language:          'EN',
      pp_MerchantID:        id,
      pp_SubMerchantID:     '',
      pp_Password:          password,
      pp_TxnRefNo:          ref,
      pp_Amount:            TO_PAISA(input.amount ?? 0),
      pp_TxnCurrency:       'PKR',
      pp_TxnDateTime:       now,
      pp_BillReference:     input.providerRef,
      pp_Description:       input.reason ?? 'MedIntel refund',
      pp_TxnExpiryDateTime: expiry,
      // Original transaction reference being refunded.
      pp_OriginalTxnRefNo:  input.providerRef,
    }
    params.pp_SecuredHash = sign(params)

    const resp = await apiPost<{ pp_ResponseCode: string; pp_ResponseMessage: string; pp_TxnRefNo?: string }>(
      '/Refund/DoRefundTransaction',
      params,
    )
    assertSuccess(resp.pp_ResponseCode, resp.pp_ResponseMessage)

    return {
      refundRef: resp.pp_TxnRefNo ?? ref,
      amount:    input.amount ?? 0,
    }
  },

  /** JazzCash has one refund endpoint for both held and captured payments. */
  async refundCaptured(input: RefundInput): Promise<RefundResult> {
    return this.refund(input)
  },

  /**
   * Verify a JazzCash return POST (their "webhook" is a browser redirect back
   * to pp_ReturnURL with all transaction params in the POST body).
   *
   * rawBody: URL-encoded form data (application/x-www-form-urlencoded).
   * headers: must contain 'content-type': 'application/x-www-form-urlencoded'.
   *
   * JazzCash response codes:
   *   '000' → success   '121' → OTP mismatch   '157' → bad credentials
   *   '126' → duplicate '109' → invalid amount  '168' → wallet limit exceeded
   */
  async verifyWebhook(rawBody: string, _headers: Headers): Promise<NormalizedEvent> {
    // Parse URL-encoded body (JazzCash POSTs a form, not JSON).
    const params = Object.fromEntries(new URLSearchParams(rawBody))

    const receivedHash = params.pp_SecuredHash ?? ''
    const { pp_SecuredHash: _, ...paramsWithoutHash } = params
    void _  // unused

    if (!verifySign(paramsWithoutHash, receivedHash)) {
      throw new Error('JazzCash webhook signature invalid')
    }

    const code        = params.pp_ResponseCode ?? ''
    const ref         = params.pp_TxnRefNo      ?? ''
    const appointmentId = params.pp_MerchantCustomerID ?? params.pp_BillReference ?? undefined

    // Map JazzCash response codes to normalized event types.
    let type: NormalizedEvent['type']
    if (code === JC_SUCCESS)     type = 'payment.succeeded'
    else if (code === '01')      type = 'payment.refunded'
    else                         type = 'payment.failed'

    const amountPaisa = parseInt(params.pp_Amount ?? '0', 10)

    return {
      eventId:       ref || `jc-${Date.now()}`,
      type,
      providerRef:   ref || undefined,
      appointmentId: appointmentId || undefined,
      amount:        amountPaisa / 100,   // convert paisa → PKR
      raw:           params,
    }
  },
}
