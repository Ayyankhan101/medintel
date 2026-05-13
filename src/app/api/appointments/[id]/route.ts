import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
  const isDoctor  = appointment.doctor?.user.email  === session.user.email
  const isAdmin   = (session.user as any).role === 'ADMIN'

  if (!isPatient && !isDoctor && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(appointment)
}

const patchSchema = z.object({ doctorId: z.string().min(1) })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body   = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id },
    include: { patient: { include: { user: true } }, escrow: true },
  })
  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (appointment.patient.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Doctor swap is only valid before escrow is created and while the appointment is still pending.
  if (appointment.escrow) {
    return NextResponse.json({ error: 'Cannot change doctor after payment' }, { status: 409 })
  }
  if (appointment.status !== 'SCHEDULED') {
    return NextResponse.json({ error: 'Cannot change doctor on a non-pending appointment' }, { status: 409 })
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } })
  if (!doctor || doctor.kydStatus !== 'VERIFIED' || !doctor.stripeAccountId) {
    return NextResponse.json({ error: 'Doctor not bookable' }, { status: 422 })
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data:  { doctorId: parsed.data.doctorId },
  })

  return NextResponse.json(updated)
}
