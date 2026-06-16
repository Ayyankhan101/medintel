import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { computeDoctorScore } from '@/lib/doctor-scoring'

const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres')

interface ScoredDoctor {
  id: string
  specialization: string
  consultationFee: string | number
  yearsExperience: number
  rating: string | number | null
  reviewCount: number
  trustBadge: boolean
  bio: string | null
  languages: string[]
  tier: string
  user: { email: string }
  score: number
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { key: 'doctors-list', max: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const department  = searchParams.get('department')
  const trustOnly   = searchParams.get('trustOnly') === 'true'
  const tierParam   = searchParams.get('tier')
  const language    = searchParams.get('language')
  const severityStr = searchParams.get('severity')
  const severity    = severityStr ? parseInt(severityStr, 10) : null

  const departmentFilter = (department
    ? { specialization: isPostgres
        ? { contains: department, mode: 'insensitive' }
        : { contains: department } }
    : {}) as unknown as Prisma.DoctorWhereInput

  const tierFilter = (tierParam === 'JUNIOR' || tierParam === 'SENIOR')
    ? { tier: tierParam as 'JUNIOR' | 'SENIOR' }
    : {}

  const doctors = await prisma.doctor.findMany({
    where: {
      kydStatus: 'VERIFIED',
      ...departmentFilter,
      ...tierFilter,
      ...(trustOnly ? { trustBadge: true } : {}),
    },
    include: { user: { select: { email: true } } },
    take: 50,
  })

  const scored: ScoredDoctor[] = doctors.map(d => {
    const score = computeDoctorScore({
      doctor: {
        languages: d.languages ?? [],
        tier: d.tier,
        rating: d.rating ? Number(d.rating) : null,
        reviewCount: d.reviewCount,
      },
      language,
      severity,
    })

    return {
      id: d.id,
      specialization: d.specialization,
      consultationFee: Number(d.consultationFee),
      yearsExperience: d.yearsExperience,
      rating: d.rating ? Number(d.rating) : null,
      reviewCount: d.reviewCount,
      trustBadge: d.trustBadge,
      bio: d.bio,
      languages: d.languages ?? [],
      tier: d.tier,
      user: { email: d.user.email },
      score,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return NextResponse.json(scored.slice(0, 3))
}
