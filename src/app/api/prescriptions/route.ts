import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { providerFor, type ProviderId } from '@/lib/payments'
import { audit } from '@/lib/audit'
import { sendPrescriptionReady, sendEscrowReleased, sendReviewNudge } from '@/lib/email'

const schema = z.object({
  appointmentId:    z.string().min(1),
  prescriptionText: z.string().min(5, 'Prescription text required'),
  fileUrl:          z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Only doctors can upload prescriptions' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: {
      escrow:  true,
      doctor:  { include: { user: true } },
      patient: { include: { user: true } },
    },
  })

  if (!appointment)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (!appointment.doctor)
    return NextResponse.json({ error: 'No doctor assigned to this appointment' }, { status: 422 })
  if (appointment.doctor.user.id !== session.user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.appointment.update({
    where: { id: appointment.id },
    data:  {
      prescriptionUrl:  parsed.data.fileUrl ?? null,
      prescriptionText: parsed.data.prescriptionText,
    },
  })

  await prisma.medicalRecord.create({
    data: {
      patientId:  appointment.patientId,
      type:       'PRESCRIPTION',
      title:      `Prescription — ${new Date().toLocaleDateString('en-PK')}`,
      content:    parsed.data.prescriptionText,
      fileUrl:    parsed.data.fileUrl ?? null,
      recordedAt: new Date(),
    },
  })

  // Auto-release escrow
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId) {
    await providerFor(appointment.escrow.provider as ProviderId).capture({
      providerRef:     appointment.escrow.providerRef ?? appointment.escrow.stripePaymentIntentId!,
      amount:          Number(appointment.escrow.amount),
      doctorAccountId: appointment.doctor.stripeAccountId,
    })
    await Promise.all([
      prisma.escrow.update({
        where: { id: appointment.escrow.id },
        data:  { status: 'RELEASED', releasedAt: new Date() },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data:  { status: 'COMPLETED', completedAt: new Date() },
      }),
    ])
  } else if (appointment.escrow?.status === 'HELD' && !appointment.doctor.stripeAccountId) {
    // Escrow is held but the doctor has no payout account — release skipped.
    // Ops must trigger manual disbursement.
    void audit('escrow.release_skipped', 'Appointment', appointment.id, {
      actorId: session.user.id, escrowId: appointment.escrow.id,
      provider: appointment.escrow.provider, reason: 'no_payout_account',
    })
  }

  await audit('prescription.upload', 'Appointment', appointment.id, {
    actorId: session.user.id, actorRole: 'DOCTOR',
    appointmentId: appointment.id, patientId: appointment.patientId,
    hasFile: !!parsed.data.fileUrl,
  })
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId) {
    await audit('escrow.release', 'Appointment', appointment.id, {
      actorId: session.user.id, actorRole: 'DOCTOR',
      amount: Number(appointment.escrow.amount),
      escrowId: appointment.escrow.id,
    })
  }

  // Fire-and-forget notifications. Never block the response on email.
  if (appointment.patient.user.email) {
    void sendPrescriptionReady({
      to:            appointment.patient.user.email,
      patientName:   appointment.patient.user.name ?? 'there',
      doctorName:    appointment.doctor.user.name ?? 'your doctor',
      appointmentId: appointment.id,
    })
  }
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId && appointment.doctor.user.email) {
    void sendEscrowReleased({
      to:            appointment.doctor.user.email,
      doctorName:    appointment.doctor.user.name ?? 'Doctor',
      amount:        Number(appointment.escrow.amount),
      appointmentId: appointment.id,
    })
  }
  // Review nudge — only when the appointment actually transitioned to COMPLETED.
  // (Doctor may upload Rx without escrow release; we only nudge when the consultation is truly done.)
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId && appointment.patient.user.email) {
    void sendReviewNudge({
      to:            appointment.patient.user.email,
      patientName:   appointment.patient.user.name ?? 'there',
      doctorName:    appointment.doctor.user.name ?? 'your doctor',
      appointmentId: appointment.id,
    })
  }

  return NextResponse.json({ message: 'Prescription saved and payment released' })
}
