import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')
  const trustOnly  = searchParams.get('trustOnly') === 'true'

  const doctors = await prisma.doctor.findMany({
    where: {
      kydStatus: 'VERIFIED',
      ...(department ? { specialization: { contains: department, mode: 'insensitive' } } : {}),
      ...(trustOnly  ? { trustBadge: true } : {}),
    },
    include: { user: { select: { email: true } } },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 20,
  })

  return NextResponse.json(doctors)
}
