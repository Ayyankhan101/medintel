/**
 * Cron — nightly maintenance batch.
 *
 * Runs once daily (vercel.json: 0 3 * * * — 03:00 UTC ~= 08:00 PKT). Each step
 * is independent and best-effort: a failure in one task does not abort others.
 *
 *  1. Expired clinic invites   → delete unaccepted, expired rows
 *  2. Email-verify tokens      → null out tokens past their TTL
 *  3. Password-reset tokens    → null out tokens past their TTL
 *  4. Subscription drift       → re-pull from Stripe when currentPeriodEnd is stale
 *  5. Transcript retention     → null raw transcript on approved notes > 365d old
 */
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { PLAN_QUOTA, planFromPriceId } from '@/lib/clinic'
import { sendClinicQuotaAlert } from '@/lib/email'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const TRANSCRIPT_RETENTION_DAYS = 365

function authed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}` ||
         req.headers.get('x-cron-secret') === secret
}

async function pruneInvites() {
  const r = await prisma.clinicInvite.deleteMany({
    where: { acceptedAt: null, expiresAt: { lt: new Date() } },
  })
  return r.count
}

async function pruneEmailVerifyTokens() {
  const r = await prisma.user.updateMany({
    where: { emailVerifyToken: { not: null }, emailVerifyExpires: { lt: new Date() } },
    data:  { emailVerifyToken: null, emailVerifyExpires: null },
  })
  return r.count
}

async function prunePasswordResetTokens() {
  const r = await prisma.user.updateMany({
    where: { passwordResetToken: { not: null }, passwordResetExpires: { lt: new Date() } },
    data:  { passwordResetToken: null, passwordResetExpires: null },
  })
  return r.count
}

// Catch clinics where Stripe webhooks were missed: currentPeriodEnd is in the
// past but the subscription is still live. Re-pulls from Stripe to reconcile.
async function reconcileSubscriptionDrift() {
  const candidates = await prisma.clinic.findMany({
    where: {
      stripeSubscriptionId: { not: null },
      OR: [
        { currentPeriodEnd: null },
        { currentPeriodEnd: { lt: new Date() } },
      ],
    },
    take:   50,
    select: { id: true, stripeSubscriptionId: true },
  })

  let reconciled = 0
  for (const c of candidates) {
    if (!c.stripeSubscriptionId) continue
    try {
      // current_period_end isn't on the SDK's Subscription type in some versions
      // but the API returns it. Narrow cast rather than `any`.
      const sub = await getStripe().subscriptions.retrieve(c.stripeSubscriptionId) as
        Stripe.Subscription & { current_period_end?: number }
      const priceId = sub.items.data[0]?.price?.id
      const plan    = planFromPriceId(priceId)
      const active  = sub.status === 'active' || sub.status === 'trialing'

      await prisma.clinic.update({
        where: { id: c.id },
        data: {
          ...(plan ? { plan, minutesQuota: PLAN_QUOTA[plan] } : {}),
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          active,
        },
      })
      reconciled++
    } catch (e) {
      console.error('[cron.maintenance] sub drift failed for clinic', c.id, e)
    }
  }
  return reconciled
}

// Send 80% / 100% quota alerts. quotaAlertLevel acts as an FSM (0 → 80 → 100)
// reset to 0 by the invoice.paid webhook each renewal.
async function sendQuotaAlerts() {
  const clinics = await prisma.clinic.findMany({
    where: { active: true, minutesQuota: { gt: 0 } },
    include: { owner: { select: { name: true, email: true } } },
    take:    500,
  })
  let sent = 0
  for (const c of clinics) {
    const pct = (c.minutesUsed / c.minutesQuota) * 100
    let target: 0 | 80 | 100 = 0
    if      (pct >= 100) target = 100
    else if (pct >= 80)  target = 80

    if (target > c.quotaAlertLevel && c.owner.email) {
      void sendClinicQuotaAlert({
        to:           c.owner.email,
        clinicName:   c.name,
        ownerName:    c.owner.name ?? 'there',
        level:        target as 80 | 100,
        minutesUsed:  c.minutesUsed,
        minutesQuota: c.minutesQuota,
      })
      await prisma.clinic.update({ where: { id: c.id }, data: { quotaAlertLevel: target } })
      sent++
    }
  }
  return sent
}

// Drop raw transcript text once the doctor has approved the SOAP note and
// retention period has elapsed. Structured SOAP fields are kept.
async function pruneOldTranscripts() {
  const cutoff = new Date(Date.now() - TRANSCRIPT_RETENTION_DAYS * 24 * 60 * 60_000)
  const r = await prisma.consultationNote.updateMany({
    where: { approvedAt: { not: null, lt: cutoff }, transcript: { not: '' } },
    data:  { transcript: '' },
  })
  return r.count
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results: Record<string, number | string> = {}
  for (const [name, fn] of [
    ['invites',         pruneInvites],
    ['emailTokens',     pruneEmailVerifyTokens],
    ['passwordTokens',  prunePasswordResetTokens],
    ['subscriptions',   reconcileSubscriptionDrift],
    ['quotaAlerts',     sendQuotaAlerts],
    ['transcripts',     pruneOldTranscripts],
  ] as const) {
    try { results[name] = await fn() }
    catch (e: unknown) {
      results[name] = `error: ${e instanceof Error ? e.message : 'unknown'}`
      console.error(`[cron.maintenance] ${name} failed`, e)
    }
  }

  void audit('cron.maintenance', 'Cron', 'maintenance', results)
  return NextResponse.json({ ok: true, results })
}
