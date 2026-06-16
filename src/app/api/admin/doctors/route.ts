import { NextRequest, NextResponse } from 'next/server'
import { VerificationStatus, Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const STATUSES: Record<string, VerificationStatus> = {
  PENDING:  'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = rateLimit(req, { key: 'admin-doctors', max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const status = req.nextUrl.searchParams.get('status') ?? ''
  const where: Prisma.DoctorWhereInput = STATUSES[status] ? { kydStatus: STATUSES[status] } : {}

  const doctors = await prisma.doctor.findMany({
    where,
    orderBy: { user: { createdAt: 'desc' } },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
      _count: { select: { appointments: true } },
    },
  })

  return NextResponse.json({ doctors })
}
