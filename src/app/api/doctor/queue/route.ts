import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // e.g. SCHEDULED, IN_PROGRESS, COMPLETED

  const where: Record<string, unknown> = { doctorId: doctor.id }
  if (status) where.status = status

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    include: {
      patient: {
        include: { user: { select: { name: true, email: true, medIntelCode: true } } },
      },
      escrow: { select: { status: true } },
    },
  })

  return NextResponse.json({ appointments })
}
