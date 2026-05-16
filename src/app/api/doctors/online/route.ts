/**
 * GET /api/doctors/online?specialty=Cardiology
 *
 * Doctors currently online + reachable for "Consult Now". Filters:
 *   - kydStatus = VERIFIED
 *   - stripeAccountId set (can collect payment) — disabled until real
 *     payouts are wired, since SafePay doctors won't have stripe accounts
 *   - isOnline = true AND lastSeenAt within the last 3 minutes
 *   - specialty match (if provided)
 *
 * Ordered by lastSeenAt desc (most recently active first).
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STALE_AFTER_MS = 3 * 60_000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const specialty = req.nextUrl.searchParams.get('specialty')?.trim() || undefined
  const cutoff    = new Date(Date.now() - STALE_AFTER_MS)

  const doctors = await prisma.doctor.findMany({
    where: {
      kydStatus:  'VERIFIED',
      isOnline:   true,
      lastSeenAt: { gt: cutoff },
      ...(specialty ? { specialization: specialty } : {}),
    },
    orderBy: { lastSeenAt: 'desc' },
    take:    20,
    include: { user: { select: { name: true, id: true } } },
  })

  return NextResponse.json({
    doctors: doctors.map(d => ({
      id:               d.id,
      name:             d.user.name,
      specialization:   d.specialization,
      yearsExperience:  d.yearsExperience,
      consultationFee:  d.consultationFee,
      rating:           d.rating,
      reviewCount:      d.reviewCount,
      trustBadge:       d.trustBadge,
      lastSeenAt:       d.lastSeenAt,
    })),
  })
}
