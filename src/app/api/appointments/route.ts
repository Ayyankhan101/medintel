import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation, sendDoctorNewBooking } from '@/lib/email'
import { isAvailable, parseAvailability } from '@/lib/availability'

class SlotTakenError extends Error {}

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

  // If a doctor is supplied, verify they're real, KYD-verified, have Stripe
  // wired up, and the requested slot is inside their working window.
  if (doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor || doctor.kydStatus !== 'VERIFIED' || !doctor.stripeAccountId) {
      return NextResponse.json({ error: 'Doctor not bookable' }, { status: 422 })
    }
    const av = parseAvailability(doctor.availability)
    if (!isAvailable(av, new Date(scheduledAt))) {
      return NextResponse.json({ error: 'Selected time is outside the doctor\'s working hours' }, { status: 422 })
    }
  }

  const startAt   = new Date(scheduledAt)
  const windowLo  = new Date(startAt.getTime() - 30 * 60_000)
  const windowHi  = new Date(startAt.getTime() + 30 * 60_000)

  try {
    // Serializable isolation makes the clash check + create atomic on postgres —
    // a concurrent booker hits a 40001 conflict and we surface 409. SQLite
    // serializes writes globally, so the same logic holds there.
    const appointment = await prisma.$transaction(async tx => {
      if (doctorId) {
        const clash = await tx.appointment.findFirst({
          where: {
            doctorId,
            status:      { in: ['SCHEDULED', 'IN_PROGRESS'] },
            scheduledAt: { gte: windowLo, lt: windowHi },
          },
          select: { id: true },
        })
        if (clash) throw new SlotTakenError()
      }

      return tx.appointment.create({
        data: {
          patient:     { connect: { id: patient.id } },
          scheduledAt: startAt,
          ...(triage ? {
            transcript:    triage.transcript,
            aiSummary:     triage.summary,
            severityScore: triage.severityScore,
            severityLevel: triage.severityLevel,
            department:    triage.department,
          } : {}),
          ...(doctorId ? { doctor: { connect: { id: doctorId } } } : {}),
        },
        include: {
          patient: { include: { user: true } },
          doctor:  { include: { user: true } },
        },
      })
    }, { isolationLevel: 'Serializable' })

    if (appointment.doctor && appointment.patient.user.email) {
      void sendBookingConfirmation({
        to:            appointment.patient.user.email,
        patientName:   appointment.patient.user.name ?? 'there',
        doctorName:    appointment.doctor.user.name ?? 'your doctor',
        specialty:     appointment.doctor.specialization,
        scheduledAt:   appointment.scheduledAt,
        appointmentId: appointment.id,
      })
    }
    if (appointment.doctor?.user.email) {
      void sendDoctorNewBooking({
        to:            appointment.doctor.user.email,
        doctorName:    appointment.doctor.user.name ?? 'Doctor',
        patientCode:   appointment.patient.user.medIntelCode ?? appointment.patient.user.email,
        scheduledAt:   appointment.scheduledAt,
        severityLevel: appointment.severityLevel ?? 'ROUTINE',
        appointmentId: appointment.id,
      })
    }

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 })
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return NextResponse.json({ error: 'That slot is already booked. Pick another time.' }, { status: 409 })
    }
    // Postgres serialization failure (40001) when two bookings race the same slot.
    if ((e as { code?: string }).code === 'P2034' || (e as { code?: string }).code === '40001') {
      return NextResponse.json({ error: 'That slot is already booked. Pick another time.' }, { status: 409 })
    }
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
    include: {
      doctor: { include: { user: true } },
      review: { select: { id: true, rating: true } },
    },
  })

  return NextResponse.json({ appointments })
}
