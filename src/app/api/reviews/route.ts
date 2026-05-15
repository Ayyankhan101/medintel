/**
 * POST /api/reviews — patient submits a review for a completed appointment.
 *   body: { appointmentId, rating: 1..5, comment? }
 *
 * Guards:
 *  - caller is a PATIENT and owns the appointment
 *  - appointment.status === 'COMPLETED' (no rage-rating a scheduled or cancelled visit)
 *  - one review per appointment (unique constraint at DB level — race-safe)
 *  - rating is integer 1..5 (CHECK at DB level too)
 *
 * Recomputes the doctor's running average + count atomically in a transaction.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  appointmentId: z.string().min(1),
  rating:        z.number().int().min(1).max(5),
  comment:       z.string().trim().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PATIENT')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = rateLimit(req, { key: 'review', max: 10, windowMs: 15 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many reviews. Try again later.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id }, select: { id: true } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const appt = await prisma.appointment.findUnique({
    where:  { id: parsed.data.appointmentId },
    select: { id: true, patientId: true, doctorId: true, status: true },
  })
  if (!appt || appt.patientId !== patient.id) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (!appt.doctorId)                          return NextResponse.json({ error: 'No doctor on this appointment' }, { status: 422 })
  if (appt.status !== 'COMPLETED')             return NextResponse.json({ error: 'Only completed consultations can be reviewed' }, { status: 422 })

  try {
    const review = await prisma.$transaction(async tx => {
      const created = await tx.review.create({
        data: {
          appointmentId: appt.id,
          patientId:     patient.id,
          doctorId:      appt.doctorId!,
          rating:        parsed.data.rating,
          comment:       parsed.data.comment || null,
        },
      })

      // Recompute aggregate from source of truth (cheap; bounded by reviewCount).
      const agg = await tx.review.aggregate({
        where:  { doctorId: appt.doctorId! },
        _avg:   { rating: true },
        _count: { _all: true },
      })
      await tx.doctor.update({
        where: { id: appt.doctorId! },
        data:  {
          rating:      agg._avg.rating ? new Prisma.Decimal(agg._avg.rating.toFixed(2)) : null,
          reviewCount: agg._count._all,
        },
      })
      return created
    })

    void audit('review.create', 'Appointment', appt.id, {
      actorId:   session.user.id,
      actorRole: 'PATIENT',
      rating:    review.rating,
    })

    return NextResponse.json({ id: review.id, rating: review.rating }, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'You already reviewed this consultation.' }, { status: 409 })
    }
    console.error('[reviews POST]', e)
    return NextResponse.json({ error: 'Could not save review' }, { status: 500 })
  }
}
