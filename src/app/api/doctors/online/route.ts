/**
 * GET /api/doctors/online?specialty=Cardiology&severityScore=7
 *
 * Doctors currently online + reachable for "Consult Now". Filters:
 *   - kydStatus = VERIFIED
 *   - isOnline = true AND lastSeenAt within the last 3 minutes
 *   - specialty match (if provided)
 *   - tier: if severityScore ≥ 7 or forceSenior=true → SENIOR only;
 *           otherwise both tiers are returned (JUNIOR first, SENIOR as backup)
 *
 * Ordered by tier (SENIOR first when mixed), then lastSeenAt desc.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { requiresSenior } from '@/lib/triage'

const STALE_AFTER_MS = 3 * 60_000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(req, { key: 'doctors-online', max: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = req.nextUrl
  const specialty   = searchParams.get('specialty')?.trim() || undefined
  const scoreParam  = searchParams.get('severityScore')
  const levelParam  = searchParams.get('severityLevel') ?? ''
  const deptParam   = searchParams.get('department') ?? ''
  const forceSenior = searchParams.get('forceSenior') === 'true'

  const score      = scoreParam ? parseInt(scoreParam, 10) : 0
  const seniorOnly = forceSenior || requiresSenior(score, levelParam, deptParam)

  const cutoff = new Date(Date.now() - STALE_AFTER_MS)

  const doctors = await prisma.doctor.findMany({
    where: {
      kydStatus:  'VERIFIED',
      isOnline:   true,
      lastSeenAt: { gt: cutoff },
      ...(specialty   ? { specialization: specialty }   : {}),
      ...(seniorOnly  ? { tier: 'SENIOR' }              : {}),
    },
    orderBy: [{ lastSeenAt: 'desc' }],
    take:    20,
    include: { user: { select: { name: true, id: true } } },
  })

  return NextResponse.json({
    seniorOnly,
    doctors: doctors.map(d => ({
      id:              d.id,
      name:            d.user.name,
      specialization:  d.specialization,
      tier:            d.tier,
      yearsExperience: d.yearsExperience,
      consultationFee: d.consultationFee,
      rating:          d.rating,
      reviewCount:     d.reviewCount,
      trustBadge:      d.trustBadge,
      lastSeenAt:      d.lastSeenAt,
    })),
  })
}
