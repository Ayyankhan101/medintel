import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findUnique({
    where:   { id },
    include: {
      doctor:  { include: { user: { select: { email: true, medIntelCode: true } } } },
      patient: { include: { user: { select: { email: true, medIntelCode: true } } } },
      escrow:  true,
    },
  })

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const isPatient = appointment.patient.user.email === session.user.email
  const isDoctor  = appointment.doctor.user.email  === session.user.email
  const isAdmin   = (session.user as any).role === 'ADMIN'

  if (!isPatient && !isDoctor && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(appointment)
}
