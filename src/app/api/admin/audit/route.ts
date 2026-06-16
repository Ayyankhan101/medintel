import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Audit `action` values are dot-separated tags like "escrow.release". Bound
// length + character set so a stray query string can't cause a runaway scan.
const ACTION_RE = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*$/i

const querySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(500).default(100),
  action: z.string().max(80).regex(ACTION_RE).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = rateLimit(req, { key: 'admin-audit', max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = querySchema.safeParse({
    limit:  req.nextUrl.searchParams.get('limit') ?? undefined,
    action: req.nextUrl.searchParams.get('action') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })

  const logs = await prisma.auditLog.findMany({
    where:   parsed.data.action ? { action: parsed.data.action } : {},
    orderBy: { createdAt: 'desc' },
    take:    parsed.data.limit,
  })
  return NextResponse.json({ logs })
}
