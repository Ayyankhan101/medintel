/**
 * Lightweight CSRF defense for state-mutating routes outside NextAuth.
 *
 * NextAuth handles CSRF tokens for sign-in/out itself. For everything else
 * (consent toggle, account delete, profile edits) we rely on:
 *   1. SameSite=lax cookies (blocks cross-site POSTs in modern browsers),
 *      already set in src/lib/auth.ts.
 *   2. Server-side origin check against an allow-list derived from
 *      NEXTAUTH_URL + VERCEL_URL + localhost dev.
 *
 * Why both: a stale browser, a misconfigured embedded webview, or a future
 * SameSite-relaxation flag in some browser can let cross-site POSTs through.
 * The origin check is cheap belt-and-suspenders.
 *
 * Usage:
 *   const fail = requireSameOrigin(req)
 *   if (fail) return fail
 */
import { NextRequest, NextResponse } from 'next/server'

function allowedOrigins(): Set<string> {
  const set = new Set<string>()
  const push = (raw: string | undefined) => {
    if (!raw) return
    try { set.add(new URL(raw).origin) } catch { /* ignore malformed */ }
  }
  push(process.env.NEXTAUTH_URL)
  push(process.env.APP_URL)
  if (process.env.VERCEL_URL) push(`https://${process.env.VERCEL_URL}`)
  if (process.env.NODE_ENV !== 'production') {
    push('http://localhost:3000')
    push('http://localhost:3100')
  }
  return set
}

export function isSameOrigin(req: NextRequest): boolean {
  const origin  = req.headers.get('origin')
  const referer = req.headers.get('referer')

  // Same-origin XHR/fetch sends Origin. If neither header is set the request
  // is suspicious for a state-mutating call — reject closed.
  if (!origin && !referer) return false

  const allowed = allowedOrigins()
  // Also accept the request's own origin (covers preview deployments where
  // VERCEL_URL is the canonical host).
  const selfOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  allowed.add(selfOrigin)

  if (origin && allowed.has(origin)) return true
  if (referer) {
    try { return allowed.has(new URL(referer).origin) } catch { return false }
  }
  return false
}

export function requireSameOrigin(req: NextRequest): NextResponse | null {
  if (isSameOrigin(req)) return null
  return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
}
