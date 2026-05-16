/**
 * POST /api/appointments/instant — "Consult Now" booking.
 *
 * Books an appointment scheduled at `now` with an online doctor. Skips the
 * normal availability-window check (the doctor manually flipped themselves to
 * online, so they're available now by definition). Still enforces:
 *   - patient signed in + has a Patient row
 *   - doctor KYD verified
 *   - doctor isOnline + lastSeenAt fresh
 *   - no slot collision (someone else just grabbed them seconds earlier)
 *
 * Returns the new appointment id so the client can immediately POST
 * /api/escrow/checkout to start payment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation, sendDoctorNewBooking } from '@/lib/email'
import { rateLimitDb } from '@/lib/rate-limit'

const STALE_AFTER_MS = 3 * 60_000

const schema = z.object({
  doctorId: z.string().min(1),
  triageId: z.string().optional(),
})

class DoctorUnavailable extends Error {}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = await rateLimitDb('appt-instant', session.user.id!, { max: 3, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many consult-now requests. Slow down.' }, { status: 429 })

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id! } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const triage = parsed.data.triageId
    ? await prisma.triage.findUnique({ where: { id: parsed.data.triageId } })
    : null
  if (parsed.data.triageId && (!triage || triage.patientId !== patient.id))
    return NextResponse.json({ error: 'Triage not found' }, { status: 404 })

  try {
    const startAt = new Date()
    const appointment = await prisma.$transaction(async tx => {
      const doctor = await tx.doctor.findUnique({ where: { id: parsed.data.doctorId } })
      if (!doctor || doctor.kydStatus !== 'VERIFIED' || !doctor.isOnline
          || !doctor.lastSeenAt || doctor.lastSeenAt.getTime() < Date.now() - STALE_AFTER_MS) {
        throw new DoctorUnavailable()
      }
      // Reject if the doctor already has any active appointment within ±30m
      // of `now`. Catches both "they're mid-call with someone" and "they have
      // a scheduled slot starting in 10m" — Consult-Now must not overlap.
      const clash = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          status:   { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledAt: {
            gte: new Date(startAt.getTime() - 30 * 60_000),
            lte: new Date(startAt.getTime() + 30 * 60_000),
          },
        },
        select: { id: true },
      })
      if (clash) throw new DoctorUnavailable()

      return tx.appointment.create({
        data: {
          patient: { connect: { id: patient.id } },
          doctor:  { connect: { id: doctor.id } },
          scheduledAt: startAt,
          ...(triage ? {
            transcript:    triage.transcript,
            aiSummary:     triage.summary,
            severityScore: triage.severityScore,
            severityLevel: triage.severityLevel,
            department:    triage.department,
          } : {}),
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

    return NextResponse.json({ appointmentId: appointment.id, instant: true }, { status: 201 })
  } catch (e) {
    if (e instanceof DoctorUnavailable)
      return NextResponse.json({ error: 'Doctor just went offline. Pick another or schedule for later.' }, { status: 409 })
    console.error('[appointments/instant]', e)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
