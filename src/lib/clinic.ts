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

export const PLAN_QUOTA: Record<'STARTER' | 'STANDARD' | 'ENTERPRISE', number> = {
  STARTER:    2_000,
  STANDARD:   8_000,
  ENTERPRISE: 25_000,
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

export async function quotaExceeded(clinicId: string): Promise<boolean> {
  const c = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { minutesUsed: true, minutesQuota: true, active: true } })
  if (!c || !c.active) return true
  return c.minutesUsed >= c.minutesQuota
}
