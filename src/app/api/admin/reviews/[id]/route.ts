/**
 * PATCH /api/admin/reviews/[id] — moderate a review.
 *
 * Body: { action: 'hide' | 'restore', reason?: string }
 *
 * Hiding sets Review.hiddenAt + hiddenBy + hiddenReason. The row is never
 * deleted so admins can audit "what we removed and why". The doctor rating
 * aggregation is NOT auto-recomputed here — that's a follow-up job — but the
 * review will stop showing in the public list immediately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { requireSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

const schema = z.object({
  action: z.enum(['hide', 'restore']),
  reason: z.string().trim().min(3).max(500).optional(),
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

  const review = await prisma.review.findUnique({ where: { id } })
  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  if (parsed.data.action === 'hide') {
    if (!parsed.data.reason) {
      return NextResponse.json({ error: 'Reason required to hide a review' }, { status: 400 })
    }
    await prisma.review.update({
      where: { id },
      data:  { hiddenAt: new Date(), hiddenBy: session.user.id, hiddenReason: parsed.data.reason },
    })
    void audit('review.hide', 'Review', id, {
      actorId: session.user.id, actorRole: 'ADMIN', reason: parsed.data.reason,
    })
  } else {
    await prisma.review.update({
      where: { id },
      data:  { hiddenAt: null, hiddenBy: null, hiddenReason: null },
    })
    void audit('review.restore', 'Review', id, {
      actorId: session.user.id, actorRole: 'ADMIN',
    })
  }

  return NextResponse.json({ ok: true })
}
