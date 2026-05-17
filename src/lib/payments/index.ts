/**
 * Payment provider router.
 *
 *  - SafePay when SAFEPAY_API_KEY is set       (production / PK-local)
 *  - Stripe when STRIPE_SECRET_KEY is set      (international / fallback)
 *  - Mock otherwise                            (demos, dev)
 *
 * The route handlers call `pickProvider()` and never reach for a specific
 * adapter directly.
 */

import type { PaymentProvider, ProviderId } from './types'
import { safepayProvider } from './safepay'
import { stripeProvider }  from './stripe'
import { mockProvider }    from './mock'

export * from './types'

export function pickProvider(preferred?: ProviderId): PaymentProvider {
  if (preferred) {
    if (preferred === 'safepay' && process.env.SAFEPAY_API_KEY) return safepayProvider
    if (preferred === 'stripe'  && process.env.STRIPE_SECRET_KEY) return stripeProvider
    if (preferred === 'mock')                                   return mockProvider
  }
  if (process.env.SAFEPAY_API_KEY)   return safepayProvider
  if (process.env.STRIPE_SECRET_KEY) return stripeProvider
  return mockProvider
}

export function providerFor(id: ProviderId): PaymentProvider {
  switch (id) {
    case 'stripe':  return stripeProvider
    case 'safepay': return safepayProvider
    case 'mock':    return mockProvider
    default:        throw new Error(`Unknown payment provider: ${id as string}`)
  }
}
