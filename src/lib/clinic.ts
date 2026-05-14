/**
 * Clinic helpers — usage metering + quota enforcement for B2B tier.
 *
 *   await meter(clinicId, 'whatsapp', 1, { from })
 *
 * Fire-and-forget. We meter on minute-granularity (rounded up).
 * Channels: 'whatsapp' | 'voice' | 'web' | 'scribe'
 */

import { prisma } from './prisma'

export type Channel = 'whatsapp' | 'voice' | 'web' | 'scribe'

export type Plan = 'STARTER' | 'STANDARD' | 'ENTERPRISE'

export const PLAN_QUOTA: Record<Plan, number> = {
  STARTER:    2_000,
  STANDARD:   8_000,
  ENTERPRISE: 25_000,
}

/**
 * Stripe price IDs per plan. Set in env when each plan's Price is
 * created in the Stripe dashboard. ENTERPRISE is intentionally not
 * self-serve — falls back to a sales contact.
 */
export const PLAN_PRICE_ID: Record<Plan, string | undefined> = {
  STARTER:    process.env.STRIPE_PRICE_STARTER,
  STANDARD:   process.env.STRIPE_PRICE_STANDARD,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null
  for (const [plan, id] of Object.entries(PLAN_PRICE_ID)) {
    if (id === priceId) return plan as Plan
  }
  return null
}

export async function meter(
  clinicId: string | null | undefined,
  channel:  Channel,
  minutes:  number,
  meta?:    Record<string, unknown>,
): Promise<void> {
  if (!clinicId || minutes <= 0) return
  const m = Math.max(1, Math.ceil(minutes))
  try {
    await prisma.$transaction([
      prisma.clinicUsage.create({
        data: { clinicId, channel, minutes: m, meta: (meta as Record<string, unknown>) ?? undefined } as never,
      }),
      prisma.clinic.update({
        where: { id: clinicId },
        data:  { minutesUsed: { increment: m } },
      }),
    ])
  } catch (e) {
    console.error('[clinic.meter] failed', { clinicId, channel, m, e })
  }
}

/**
 * Slugify a clinic name and append a 4-char random suffix to keep
 * collisions vanishingly unlikely without a uniqueness loop.
 */
export function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'clinic'
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

export async function quotaExceeded(clinicId: string): Promise<boolean> {
  const c = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { minutesUsed: true, minutesQuota: true, active: true } })
  if (!c || !c.active) return true
  return c.minutesUsed >= c.minutesQuota
}
