import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  scheduledAt: z.string().datetime(),
  doctorId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  if (parsed.data.doctorId) {
    const appointment = await prisma.appointment.create({
      data: {
        patientId:   patient.id,
        doctorId:    parsed.data.doctorId,
        scheduledAt: new Date(parsed.data.scheduledAt),
      },
    })
    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 })
  }

  // Draft appointment without doctor — will be assigned after triage
  const firstDoctor = await prisma.doctor.findFirst({ where: { kydStatus: 'VERIFIED' } })
  if (!firstDoctor) {
    return NextResponse.json({ error: 'No verified doctors available yet' }, { status: 503 })
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId:   patient.id,
      doctorId:    firstDoctor.id,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
  })

  return NextResponse.json({ appointmentId: appointment.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ appointments: [] })

  const appointments = await prisma.appointment.findMany({
    where:   { patientId: patient.id },
    orderBy: { createdAt: 'desc' },
    include: { doctor: { include: { user: true } } },
  })

  return NextResponse.json({ appointments })
}
