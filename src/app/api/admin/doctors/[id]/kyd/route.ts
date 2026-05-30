/**
 * PATCH /api/admin/doctors/[id]/kyd
 *
 * Admin-only — flip a doctor's KYD tier and trust badge.
 *
 * Body: { tier: 1 | 2 | 3, status?: 'VERIFIED' | 'REJECTED', trustBadge?: boolean, reason?: string }
 *
 * Tier semantics (per PMDC compliance plan):
 *   Tier 1: license accepted at signup (auto)
 *   Tier 2: ID document + selfie reviewed by ops
 *   Tier 3: peer cross-check (another verified doctor confirms identity)
 *
 * Setting tier=N stamps the corresponding kydTier{N}At column. trustBadge
 * is the public "verified" badge shown on the doctor card.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { requireSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tier:       z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status:     z.enum(['VERIFIED', 'REJECTED']).optional(),
  trustBadge: z.boolean().optional(),
  reason:     z.string().trim().max(500).optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { id } = await ctx.params
  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const doctor = await prisma.doctor.findUnique({ where: { id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const now = new Date()
  const data: Record<string, unknown> = {}
  if (parsed.data.tier === 1) data.kydTier1At = now
  if (parsed.data.tier === 2) data.kydTier2At = now
  if (parsed.data.tier === 3) {
    data.kydTier3At = now
    data.tier       = 'SENIOR'   // schema enum DoctorTier
  }
  if (parsed.data.status)     data.kydStatus  = parsed.data.status
  if (parsed.data.trustBadge !== undefined) data.trustBadge = parsed.data.trustBadge

  await prisma.doctor.update({ where: { id }, data })

  void audit('kyd.tier_update', 'Doctor', id, {
    actorId: session.user.id, actorRole: 'ADMIN',
    tier:    parsed.data.tier,
    status:  parsed.data.status,
    badge:   parsed.data.trustBadge,
    reason:  parsed.data.reason,
  })

  return NextResponse.json({ ok: true })
}
