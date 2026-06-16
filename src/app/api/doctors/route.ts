import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
    let score = 1.0

    // Language match: 1.5x if doctor speaks the patient's language
    if (language && d.languages?.length > 0) {
      const langs = d.languages.map(l => l.toLowerCase())
      if (langs.includes(language.toLowerCase())) {
        score *= 1.5
      }
    }

    // Seniority: high-severity cases get 1.3x bonus for SENIOR doctors
    if (severity !== null && severity >= 7 && d.tier === 'SENIOR') {
      score *= 1.3
    }

    // Rating contribution: up to 1.1x for top-rated
    const rating = d.rating ? Number(d.rating) : 0
    if (rating > 0) {
      score *= 1 + (rating / 5) * 0.1
    }

    // Review count slight bonus (social proof)
    if (d.reviewCount >= 50) score *= 1.05
    else if (d.reviewCount >= 10) score *= 1.02

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
      score: Math.round(score * 100) / 100,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return NextResponse.json(scored.slice(0, 3))
}
