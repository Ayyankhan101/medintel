import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  const [today, week, pending, completed] = await Promise.all([
    prisma.appointment.count({
      where: {
        doctorId:    doctor.id,
        scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.appointment.count({
      where: {
        doctorId:    doctor.id,
        scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.appointment.count({
      where: { doctorId: doctor.id, status: 'SCHEDULED' },
    }),
    prisma.appointment.count({
      where: { doctorId: doctor.id, status: 'COMPLETED' },
    }),
  ])

  return NextResponse.json({ today, week, pending, completed })
}
