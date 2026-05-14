/**
 * GET /api/clinic/me — current clinic-admin's clinic + summary stats.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const owned = await prisma.clinic.findUnique({
    where:   { ownerUserId: session.user.id },
    include: {
      _count: { select: { doctors: true, members: true } },
    },
  })
  if (!owned) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000)
  const usage = await prisma.clinicUsage.groupBy({
    by: ['channel'],
    where: { clinicId: owned.id, createdAt: { gte: since } },
    _sum: { minutes: true },
  })

  return NextResponse.json({
    clinic: owned,
    usage30d: usage.map(u => ({ channel: u.channel, minutes: u._sum.minutes ?? 0 })),
  })
}
