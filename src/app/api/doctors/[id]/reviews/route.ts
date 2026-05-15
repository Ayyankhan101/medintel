/**
 * GET /api/doctors/[id]/reviews — public paginated review list.
 *   ?cursor=<reviewId>&limit=10
 *
 * Returns reviews + the patient's display name (first name only — never email).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 60

const MAX_LIMIT = 25

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const url    = req.nextUrl
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 10) || 10, MAX_LIMIT)
  const cursor = url.searchParams.get('cursor') || undefined

  const reviews = await prisma.review.findMany({
    where:   { doctorId: id },
    orderBy: { createdAt: 'desc' },
    take:    limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:        true,
      rating:    true,
      comment:   true,
      createdAt: true,
      patient:   { select: { user: { select: { name: true } } } },
    },
  })

  const hasMore = reviews.length > limit
  const page    = hasMore ? reviews.slice(0, limit) : reviews

  return NextResponse.json({
    reviews: page.map(r => ({
      id:        r.id,
      rating:    r.rating,
      comment:   r.comment,
      createdAt: r.createdAt,
      // Display first token only so we don't leak full identity.
      author:    (r.patient.user.name ?? 'Anonymous').split(' ')[0],
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  })
}
