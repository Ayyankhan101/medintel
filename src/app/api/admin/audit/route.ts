import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10), 500)
  const action = req.nextUrl.searchParams.get('action') ?? undefined

  const logs = await prisma.auditLog.findMany({
    where:   action ? { action } : {},
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  return NextResponse.json({ logs })
}
