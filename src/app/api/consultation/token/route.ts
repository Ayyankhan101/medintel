import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateVideoToken, appointmentRoomName } from '@/lib/twilio'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor:  { include: { user: true } },
      escrow:  true,
    },
  })

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (!appointment.doctor) return NextResponse.json({ error: 'No doctor assigned to this appointment' }, { status: 422 })

  const isPatient = appointment.patient.user.id === session.user.id
  const isDoctor  = appointment.doctor.user.id  === session.user.id
  if (!isPatient && !isDoctor)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isPatient && appointment.escrow?.status !== 'HELD')
    return NextResponse.json({ error: 'Payment required before joining consultation' }, { status: 402 })

  const roomName = appointmentRoomName(appointment.id)
  const token    = generateVideoToken(session.user.id!, roomName)

  await prisma.appointment.update({
    where: { id: appointment.id },
    data:  { status: 'IN_PROGRESS' },
  })

  return NextResponse.json({ token, roomName, identity: session.user.id })
}
