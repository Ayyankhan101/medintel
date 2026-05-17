import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { providerFor, type ProviderId } from '@/lib/payments'
import { sendReviewNudge } from '@/lib/email'
import { audit } from '@/lib/audit'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Only doctors can release escrow' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { escrow: true, doctor: { include: { user: true } }, patient: { include: { user: true } } },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (!appointment.doctor)
    return NextResponse.json({ error: 'No doctor assigned to this appointment' }, { status: 422 })
  if (appointment.doctor.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!appointment.escrow)
    return NextResponse.json({ error: 'No escrow found for this appointment' }, { status: 404 })
  if (appointment.escrow.status !== 'HELD')
    return NextResponse.json({ error: 'Escrow is not in HELD state' }, { status: 409 })
  if (!appointment.prescriptionUrl)
    return NextResponse.json({ error: 'Prescription must be uploaded before releasing payment' }, { status: 422 })
  if (appointment.escrow.provider === 'stripe' && !appointment.doctor.stripeAccountId)
    return NextResponse.json({ error: 'Doctor Stripe account not configured' }, { status: 422 })

  // Step 1: PSP call — if this fails no money has moved, doctor can retry.
  try {
    await providerFor(appointment.escrow.provider as ProviderId).capture({
      providerRef:     appointment.escrow.providerRef ?? appointment.escrow.stripePaymentIntentId!,
      amount:          Number(appointment.escrow.amount),
      doctorAccountId: appointment.doctor.stripeAccountId ?? '',
    })
  } catch (e) {
    console.error('[escrow/release] PSP capture error', e)
    return NextResponse.json({ error: 'Payment release failed — try again or contact support' }, { status: 502 })
  }

  // Step 2: record in DB. Capture succeeded — if this write fails, doctor was paid
  // but escrow stays HELD. Audit so ops can reconcile; don't 502 the doctor.
  await Promise.all([
    prisma.escrow.update({
      where: { id: appointment.escrow.id },
      data:  { status: 'RELEASED', releasedAt: new Date() },
    }),
    prisma.appointment.update({
      where: { id: appointment.id },
      data:  { status: 'COMPLETED', completedAt: new Date() },
    }),
  ]).catch(e => {
    console.error('[escrow/release] DB update failed after PSP capture', e)
    void audit('escrow.release_db_failed', 'Appointment', appointment.id, {
      escrowId: appointment.escrow!.id, error: String(e),
    })
  })

  if (appointment.patient.user.email) {
    void sendReviewNudge({
      to:            appointment.patient.user.email,
      patientName:   appointment.patient.user.name ?? 'there',
      doctorName:    appointment.doctor.user.name ?? 'your doctor',
      appointmentId: appointment.id,
    })
  }

  return NextResponse.json({ message: 'Payment released to doctor' })
}
