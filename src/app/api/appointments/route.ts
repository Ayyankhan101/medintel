import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  scheduledAt: z.string().datetime(),
  doctorId:    z.string().optional(),
  triageId:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const { scheduledAt, doctorId, triageId } = parsed.data

  // If a triageId is provided, copy its server-side fields onto the appointment.
  // Never trust client-supplied severity / summary / transcript / department.
  let triage: Awaited<ReturnType<typeof prisma.triage.findUnique>> = null

  if (triageId) {
    triage = await prisma.triage.findUnique({ where: { id: triageId } })
    if (!triage || triage.patientId !== patient.id) {
      return NextResponse.json({ error: 'Triage not found' }, { status: 404 })
    }
  }

  // If a doctor is supplied, verify they're real, KYD-verified, and have Stripe wired up.
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor || doctor.kydStatus !== 'VERIFIED' || !doctor.stripeAccountId) {
      return NextResponse.json({ error: 'Doctor not bookable' }, { status: 422 })
    }
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patient:     { connect: { id: patient.id } },
        scheduledAt: new Date(scheduledAt),
        ...(triage ? {
          transcript:    triage.transcript,
          aiSummary:     triage.summary,
          severityScore: triage.severityScore,
          severityLevel: triage.severityLevel,
          department:    triage.department,
        } : {}),
        ...(doctorId ? { doctor: { connect: { id: doctorId } } } : {}),
      },
    })
    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 })
  } catch (e) {
    console.error('[appointments POST]', e)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
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
