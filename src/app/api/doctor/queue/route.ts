import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// SENIOR doctors default to seeing only high-acuity cases (score ≥ 7).
// Pass ?all=true to override and see the full queue.
const SENIOR_MIN_SCORE = 7

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const showAll = searchParams.get('all') === 'true'

  const where: Record<string, unknown> = { doctorId: doctor.id }
  if (status) where.status = status

  // Senior doctors see only severity ≥ 7 by default so critical cases surface
  // at the top without noise from routine consults.
  if (doctor.tier === 'SENIOR' && !showAll) {
    where.severityScore = { gte: SENIOR_MIN_SCORE }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    // Critical cases first, then chronological within same score.
    orderBy: [{ severityScore: 'desc' }, { scheduledAt: 'asc' }],
    include: {
      patient: {
        include: { user: { select: { name: true, email: true, medIntelCode: true } } },
      },
      escrow: { select: { status: true } },
    },
  })

  return NextResponse.json({ appointments, tier: doctor.tier, filtered: doctor.tier === 'SENIOR' && !showAll })
}
