/**
 * GET /api/health
 *
 * Shallow + deep health check.
 *   - Always: DB ping, AI key presence, version.
 *   - `?deep=1`: reports presence/absence of every optional integration
 *     (Stripe, Twilio, S3, Resend, Sentry, SafePay, JazzCash, Maps, NADRA,
 *     PMDC, Blob). Binary configured/missing — we do NOT call out to PSPs
 *     because that would burn quota on every uptime check.
 *
 * `ok` flips to false only when a *required* dep is down (DB or AI). Optional
 * deps surface as "missing" so a status page can show partial-degrade.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic    = 'force-dynamic'
export const revalidate = 0

function configured(...vars: string[]): 'configured' | 'missing' {
  return vars.every(v => !!process.env[v]) ? 'configured' : 'missing'
}

export async function GET(req: NextRequest) {
  const started = Date.now()
  const deep    = req.nextUrl.searchParams.get('deep') === '1'

  let db: 'ok' | 'down' = 'down'
  try {
    await prisma.$queryRaw`SELECT 1`
    db = 'ok'
  } catch {
    db = 'down'
  }

  const ai = (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) ? 'configured' : 'missing'
  const ok = db === 'ok' && ai === 'configured'

  const base = {
    ok,
    db,
    ai,
    version:  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    uptimeMs: Date.now() - started,
    now:      new Date().toISOString(),
  }

  if (!deep) {
    return NextResponse.json(base, { status: ok ? 200 : 503 })
  }

  const integrations = {
    stripe:    configured('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'),
    safepay:   configured('SAFEPAY_API_KEY', 'SAFEPAY_WEBHOOK_SECRET'),
    jazzcash:  configured('JAZZCASH_MERCHANT_ID', 'JAZZCASH_PASSWORD', 'JAZZCASH_INTEGRITY_SALT'),
    twilio:    configured('TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET'),
    livekit:   configured('LIVEKIT_API_KEY', 'LIVEKIT_HOST'),
    twilioSms: configured('TWILIO_AUTH_TOKEN', 'TWILIO_SMS_FROM'),
    s3:        configured('AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'),
    blob:      configured('BLOB_READ_WRITE_TOKEN'),
    resend:    configured('RESEND_API_KEY'),
    sentry:    configured('SENTRY_DSN'),
    maps:      configured('GOOGLE_MAPS_SERVER_KEY'),
    nadra:     configured('NADRA_API_URL', 'NADRA_API_KEY'),
    pmdc:      configured('PMDC_API_URL', 'PMDC_API_KEY'),
  }

  return NextResponse.json({ ...base, integrations }, { status: ok ? 200 : 503 })
}
