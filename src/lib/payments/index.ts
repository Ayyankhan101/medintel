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
import { mockProvider }    from './mock'

export * from './types'

export function pickProvider(preferred?: ProviderId): PaymentProvider {
  if (preferred) {
    if (preferred === 'safepay' && process.env.SAFEPAY_API_KEY) return safepayProvider
    if (preferred === 'mock')                                   return mockProvider
  }
  if (process.env.SAFEPAY_API_KEY)  return safepayProvider
  return mockProvider
}

export function providerFor(id: ProviderId): PaymentProvider {
  switch (id) {
    case 'safepay': return safepayProvider
    case 'mock':    return mockProvider
    // Stripe stays on its current dedicated routes (lib/stripe.ts) for now.
    // If we later need it through the unified surface, write a stripe adapter
    // that wraps createEscrowPaymentIntent + releaseEscrowToDoctor.
    default:        return mockProvider
  }
}
