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

function clientIp(req: NextRequest): string {
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
