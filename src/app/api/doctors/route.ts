import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// SQLite's `LIKE` is ASCII-insensitive by default; Postgres `LIKE` is case-sensitive.
// `mode: 'insensitive'` only works on Postgres — SQLite throws at runtime if we pass it.
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres')

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')
  const trustOnly  = searchParams.get('trustOnly') === 'true'
  const tierParam  = searchParams.get('tier')  // 'JUNIOR' | 'SENIOR'

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
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 20,
  })

  return NextResponse.json(doctors)
}
