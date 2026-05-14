import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [patients, doctorsPending, doctorsVerified, doctorsRejected, appts, completed, cancelled, escrowHeld, escrowReleased] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count({ where: { kydStatus: 'PENDING' } }),
    prisma.doctor.count({ where: { kydStatus: 'VERIFIED' } }),
    prisma.doctor.count({ where: { kydStatus: 'REJECTED' } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { status: 'CANCELLED' } }),
    prisma.escrow.count({ where: { status: 'HELD' } }),
    prisma.escrow.count({ where: { status: 'RELEASED' } }),
  ])

  return NextResponse.json({
    patients,
    doctors: { pending: doctorsPending, verified: doctorsVerified, rejected: doctorsRejected, total: doctorsPending + doctorsVerified + doctorsRejected },
    appointments: { total: appts, completed, cancelled },
    escrow: { held: escrowHeld, released: escrowReleased },
  })
}
