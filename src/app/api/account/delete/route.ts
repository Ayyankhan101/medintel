/**
 * POST /api/account/delete — user-initiated account deletion.
 *
 * Body: { confirm: 'DELETE MY ACCOUNT' }
 *
 * We soft-delete because prescriptions, audit logs, and consultation notes are
 * regulated medical records (Drugs Act 1976, PMDC). The user's PII is
 * anonymized in place: email is rewritten to free the unique slot for future
 * registration, name/phone are nulled/anonymized.
 *
 * Refusals:
 *  - CLINIC_ADMIN with active subscription: must cancel the subscription first.
 *  - DOCTOR with future scheduled appointments: must cancel/reassign them first.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { rateLimitDb, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({ confirm: z.literal('DELETE MY ACCOUNT') })

const TOMBSTONE_EMAIL_DOMAIN = 'deleted.medintel.invalid'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // DB-backed RL: per-user (primary) AND per-IP (secondary) so the cap holds
  // across Fluid Compute instances/regions.
  const userRl = await rateLimitDb('account-delete:user', session.user.id!, { max: 3, windowMs: 60 * 60_000 })
  const ipRl   = await rateLimitDb('account-delete:ip',   clientIp(req),       { max: 10, windowMs: 60 * 60_000 })
  if (!userRl.ok || !ipRl.ok)
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  const body   = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Confirm by sending {"confirm":"DELETE MY ACCOUNT"}' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: {
      doctor:      { select: { id: true } },
      patient:     { select: { id: true } },
      ownedClinic: { select: { id: true, stripeSubscriptionId: true } },
    },
  })
  if (!user || user.deletedAt) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // Clinic owner with live subscription must cancel via Stripe portal first.
  if (user.ownedClinic?.stripeSubscriptionId) {
    return NextResponse.json({
      error: 'Cancel your clinic subscription before deleting your account.',
      hint:  'Open /clinic/dashboard → Manage billing → Cancel subscription.',
    }, { status: 409 })
  }

  // Doctor with future appointments can't disappear.
  if (user.doctor) {
    const future = await prisma.appointment.count({
      where: { doctorId: user.doctor.id, status: 'SCHEDULED', scheduledAt: { gt: new Date() } },
    })
    if (future > 0) {
      return NextResponse.json({
        error: `You have ${future} upcoming appointment${future === 1 ? '' : 's'}. Cancel or reassign them first.`,
      }, { status: 409 })
    }
  }

  const now = new Date()
  // Free the unique email slot with a tombstone address that's syntactically
  // valid but unreachable. Random suffix prevents collisions if the same person
  // re-registers and re-deletes.
  const tombstone = `deleted-${randomBytes(6).toString('hex')}@${TOMBSTONE_EMAIL_DOMAIN}`

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt:           now,
        email:               tombstone,
        phone:               tombstone, // phone is also unique
        name:                'Deleted user',
        passwordHash:        'DELETED',
        emailVerifyToken:    null,
        emailVerifyExpires:  null,
        passwordResetToken:  null,
        passwordResetExpires: null,
      },
    }),
    // Anonymize the patient-side record too (gender, DoB, etc).
    ...(user.patient ? [prisma.patient.update({
      where: { id: user.patient.id },
      data:  { dateOfBirth: null, gender: null, address: null, emergencyContact: null },
    })] : []),
  ])

  void audit('account.delete', 'User', user.id, {
    actorId: user.id, actorRole: session.user.role, deletedAt: now.toISOString(),
  })

  return NextResponse.json({ ok: true, deletedAt: now })
}
