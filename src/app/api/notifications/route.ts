/**
 * GET  /api/notifications        — current user's inbox (latest 50)
 * PATCH /api/notifications        — { ids: string[] | 'all' } mark as read
 *
 * Returns `unread` count for badge display.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireSameOrigin } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId: session.user.id! },
      orderBy: { createdAt: 'desc' },
      take:    50,
    }),
    prisma.notification.count({
      where: { userId: session.user.id!, readAt: null },
    }),
  ])

  return NextResponse.json({ items, unread })
}

const patchSchema = z.object({
  ids: z.union([z.literal('all'), z.array(z.string().min(1)).max(100)]),
})

export async function PATCH(req: NextRequest) {
  const csrf = requireSameOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const where = parsed.data.ids === 'all'
    ? { userId: session.user.id!, readAt: null }
    : { userId: session.user.id!, id: { in: parsed.data.ids }, readAt: null }

  const result = await prisma.notification.updateMany({ where, data: { readAt: new Date() } })
  return NextResponse.json({ updated: result.count })
}
