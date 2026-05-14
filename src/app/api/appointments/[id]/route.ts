import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refundEscrow } from '@/lib/stripe'
import { sendAppointmentCancelled, sendAppointmentRescheduled } from '@/lib/email'
import { audit } from '@/lib/audit'

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
  const isAdmin   = session.user.role === 'ADMIN'

  if (!isPatient && !isDoctor && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(appointment)
}

// PATCH supports three operations, distinguished by which fields are present:
//   - reassign  : { doctorId }           — swap to a different doctor (pre-payment)
//   - reschedule: { scheduledAt }        — change time on the same booking
//   - cancel    : { action: 'cancel' }   — cancel + auto-refund held escrow
const patchSchema = z.union([
  z.object({ doctorId: z.string().min(1) }),
  z.object({ scheduledAt: z.string().datetime() }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('start') }),     // doctor: SCHEDULED -> IN_PROGRESS
  z.object({ action: z.literal('complete') }),  // doctor: IN_PROGRESS -> COMPLETED (without Rx; abandoned visit)
])

const RESCHEDULE_MIN_LEAD_MS = 30 * 60_000   // can't reschedule into < 30 min
const CANCEL_MIN_LEAD_MS     = 60 * 60_000   // can't cancel < 1h before start (call doctor instead)

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
    include: { patient: { include: { user: true } }, doctor: { include: { user: true } }, escrow: true },
  })
  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isPatient = appointment.patient.user.id === session.user.id
  const isDoctor  = appointment.doctor?.user.id === session.user.id
  const isAdmin   = session.user.role === 'ADMIN'
  if (!isPatient && !isDoctor && !isAdmin)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = Date.now()
  const scheduledMs = appointment.scheduledAt.getTime()

  // ── REASSIGN ────────────────────────────────────────────────────────────
  if ('doctorId' in parsed.data) {
    if (!isPatient && !isAdmin) return NextResponse.json({ error: 'Only the patient can reassign' }, { status: 403 })
    if (appointment.escrow)     return NextResponse.json({ error: 'Cannot change doctor after payment' }, { status: 409 })
    if (appointment.status !== 'SCHEDULED')
      return NextResponse.json({ error: 'Cannot change doctor on a non-pending appointment' }, { status: 409 })

    const doctor = await prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } })
    if (!doctor || doctor.kydStatus !== 'VERIFIED' || !doctor.stripeAccountId)
      return NextResponse.json({ error: 'Doctor not bookable' }, { status: 422 })

    const updated = await prisma.appointment.update({ where: { id }, data: { doctorId: parsed.data.doctorId } })
    return NextResponse.json(updated)
  }

  // ── RESCHEDULE ──────────────────────────────────────────────────────────
  if ('scheduledAt' in parsed.data) {
    if (appointment.status !== 'SCHEDULED')
      return NextResponse.json({ error: 'Only SCHEDULED appointments can be rescheduled' }, { status: 409 })
    const newAt = new Date(parsed.data.scheduledAt)
    if (newAt.getTime() < now + RESCHEDULE_MIN_LEAD_MS)
      return NextResponse.json({ error: 'New time must be at least 30 minutes from now' }, { status: 422 })

    const oldAt = appointment.scheduledAt
    const updated = await prisma.appointment.update({ where: { id }, data: { scheduledAt: newAt } })
    await audit('appointment.reschedule', 'Appointment', id, {
      actorId: session.user.id, actorRole: session.user.role,
      from: oldAt.toISOString(), to: newAt.toISOString(),
    })

    if (appointment.patient.user.email) {
      void sendAppointmentRescheduled({
        to: appointment.patient.user.email,
        recipientName: appointment.patient.user.name ?? 'there',
        counterpartLabel: appointment.doctor?.user.name ? `Dr. ${appointment.doctor.user.name}` : 'your doctor',
        oldAt, newAt, appointmentId: id,
      })
    }
    if (appointment.doctor?.user.email) {
      void sendAppointmentRescheduled({
        to: appointment.doctor.user.email,
        recipientName: `Dr. ${appointment.doctor.user.name ?? 'Doctor'}`,
        counterpartLabel: appointment.patient.user.medIntelCode ?? 'your patient',
        oldAt, newAt, appointmentId: id,
      })
    }
    return NextResponse.json(updated)
  }

  // ── START / COMPLETE (doctor only) ──────────────────────────────────────
  if ('action' in parsed.data && (parsed.data.action === 'start' || parsed.data.action === 'complete')) {
    if (!isDoctor && !isAdmin) return NextResponse.json({ error: 'Only the assigned doctor can change consultation status' }, { status: 403 })
    const want = parsed.data.action
    if (want === 'start') {
      if (appointment.status !== 'SCHEDULED') return NextResponse.json({ error: `Cannot start a ${appointment.status.toLowerCase()} consultation` }, { status: 409 })
      const updated = await prisma.appointment.update({ where: { id }, data: { status: 'IN_PROGRESS' } })
      return NextResponse.json(updated)
    }
    // want === 'complete'
    if (appointment.status !== 'IN_PROGRESS') return NextResponse.json({ error: 'Only IN_PROGRESS consultations can be completed' }, { status: 409 })
    const updated = await prisma.appointment.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } })
    return NextResponse.json(updated)
  }

  // ── CANCEL ──────────────────────────────────────────────────────────────
  // parsed.data.action === 'cancel'
  if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED')
    return NextResponse.json({ error: `Appointment is already ${appointment.status.toLowerCase()}` }, { status: 409 })
  if (appointment.status === 'IN_PROGRESS')
    return NextResponse.json({ error: 'Cannot cancel a consultation already in progress' }, { status: 409 })

  // Patients can cancel up to CANCEL_MIN_LEAD_MS before start. Doctors and
  // admins can cancel any time (e.g. doctor unavailable, admin compliance).
  if (isPatient && !isAdmin && scheduledMs - now < CANCEL_MIN_LEAD_MS)
    return NextResponse.json({ error: 'Cancellations must be at least 1 hour before the appointment' }, { status: 422 })

  // If escrow is HELD, refund it. RELEASED escrow can't be reversed here —
  // that needs admin + Stripe dashboard for partial refunds.
  if (appointment.escrow?.status === 'HELD') {
    try {
      await refundEscrow(appointment.escrow.stripePaymentIntentId)
      await prisma.escrow.update({
        where: { id: appointment.escrow.id },
        data:  { status: 'REFUNDED', refundedAt: new Date() },
      })
    } catch (e) {
      console.error('[appointments PATCH cancel] refund error', e)
      return NextResponse.json({ error: 'Refund failed — try again or contact support' }, { status: 502 })
    }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data:  { status: 'CANCELLED', cancelledAt: new Date() },
  })

  const refunded = appointment.escrow?.status === 'HELD'
  await audit('appointment.cancel', 'Appointment', id, {
    actorId: session.user.id, actorRole: session.user.role,
    refunded, amount: refunded ? Number(appointment.escrow!.amount) : 0,
  })
  if (appointment.patient.user.email) {
    void sendAppointmentCancelled({
      to: appointment.patient.user.email,
      recipientName: appointment.patient.user.name ?? 'there',
      counterpartLabel: appointment.doctor?.user.name ? `Dr. ${appointment.doctor.user.name}` : 'your doctor',
      scheduledAt: appointment.scheduledAt,
      refundIssued: refunded,
    })
  }
  if (appointment.doctor?.user.email) {
    void sendAppointmentCancelled({
      to: appointment.doctor.user.email,
      recipientName: `Dr. ${appointment.doctor.user.name ?? 'Doctor'}`,
      counterpartLabel: appointment.patient.user.medIntelCode ?? 'your patient',
      scheduledAt: appointment.scheduledAt,
      refundIssued: false,
    })
  }
  return NextResponse.json(updated)
}
