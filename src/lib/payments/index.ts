/**
 * Payment provider router.
 *
 * Priority when SAFEPAY_API_KEY, JAZZCASH_MERCHANT_ID, and STRIPE_SECRET_KEY
 * are all set — explicit `preferred` wins; otherwise:
 *   SafePay   (covers JazzCash + EasyPaisa + cards via one checkout)
 *   JazzCash  (direct wallet, if SafePay not configured)
 *   Stripe    (international cards fallback)
 *   Mock      (dev/demo — zero PSP setup)
 *
 * Route handlers call `pickProvider()` and never import adapters directly.
 */

import type { PaymentProvider, ProviderId } from './types'
import { safepayProvider }  from './safepay'
import { jazzcashProvider } from './jazzcash'
import { stripeProvider }   from './stripe'
import { mockProvider }     from './mock'

export * from './types'

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  safepay:  safepayProvider,
  jazzcash: jazzcashProvider,
  stripe:   stripeProvider,
  mock:     mockProvider,
}

export function pickProvider(preferred?: ProviderId): PaymentProvider {
  if (preferred && PROVIDERS[preferred]) return PROVIDERS[preferred]
  if (process.env.SAFEPAY_API_KEY)      return safepayProvider
  if (process.env.JAZZCASH_MERCHANT_ID) return jazzcashProvider
  if (process.env.STRIPE_SECRET_KEY)    return stripeProvider
  return mockProvider
}

export function providerFor(id: ProviderId): PaymentProvider {
  const p = PROVIDERS[id]
  if (!p) throw new Error(`Unknown payment provider: ${id as string}`)
  return p
}
