/**
 * Minimal token-bucket rate limiter — in-memory, per-IP.
 *
 * Trade-offs:
 *  - On Vercel Fluid Compute, instances reuse → bucket survives across requests.
 *  - But cold starts + multiple regions = limits apply per instance, not global.
 *  - Good enough to defeat naive scripts; replace with Upstash Redis at scale.
 *
 * Usage:
 *   const r = rateLimit(req, { key: 'auth', max: 5, windowMs: 60_000 })
 *   if (!r.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

import type { NextRequest } from 'next/server'
import { prisma } from './prisma'

interface Bucket {
  count: number
  resetAt: number
}
const buckets = new Map<string, Bucket>()

// GC stale buckets every 10 min so the map doesn't grow forever.
const GC_INTERVAL = 10 * 60_000
let lastGc = Date.now()
function maybeGc(now: number) {
  if (now - lastGc < GC_INTERVAL) return
  lastGc = now
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k)
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  req: NextRequest,
  opts: { key: string; max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()
  maybeGc(now)
  const id = `${opts.key}:${clientIp(req)}`
  const b = buckets.get(id)
  if (!b || b.resetAt < now) {
    const resetAt = now + opts.windowMs
    buckets.set(id, { count: 1, resetAt })
    return { ok: true, remaining: opts.max - 1, resetAt }
  }
  b.count += 1
  return { ok: b.count <= opts.max, remaining: Math.max(0, opts.max - b.count), resetAt: b.resetAt }
}

/**
 * Persistent, shared rate limiter for auth/credential endpoints.
 *
 * Backed by `RateLimitBucket` in the DB so limits hold across Fluid Compute
 * instances and regions. Identifier is whatever you pass (typically IP + email
 * for login, IP alone for register/forgot) — picks the stricter of the two.
 *
 * The fast in-memory `rateLimit()` above is still fine for non-auth endpoints
 * (voice/whatsapp) where per-instance accuracy is acceptable.
 */
export async function rateLimitDb(
  key: string,
  identifier: string,
  opts: { max: number; windowMs: number },
): Promise<RateLimitResult> {
  const id      = `${key}:${identifier}`
  const now     = new Date()
  const resetAt = new Date(now.getTime() + opts.windowMs)

  // Atomic: create-if-absent, else increment and recycle expired window.
  // Wrapped in a transaction so we don't race two near-simultaneous requests.
  const bucket = await prisma.$transaction(async tx => {
    const existing = await tx.rateLimitBucket.findUnique({ where: { id } })
    if (!existing || existing.resetAt < now) {
      return tx.rateLimitBucket.upsert({
        where:  { id },
        create: { id, count: 1, resetAt },
        update: { count: 1, resetAt },
      })
    }
    return tx.rateLimitBucket.update({
      where: { id },
      data:  { count: { increment: 1 } },
    })
  })

  return {
    ok:        bucket.count <= opts.max,
    remaining: Math.max(0, opts.max - bucket.count),
    resetAt:   bucket.resetAt.getTime(),
  }
}
