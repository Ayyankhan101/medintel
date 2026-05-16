/**
 * Cron — doctor no-show auto-refund.
 *
 * Runs every 15 minutes. Finds SCHEDULED appointments where:
 *   - scheduledAt was more than NO_SHOW_GRACE_MS ago (doctor never started)
 *   - status is still SCHEDULED (never flipped to IN_PROGRESS)
 *   - escrow exists and is HELD
 *
 * Refunds the patient automatically and flips the appointment to REFUNDED with
 * cancelledBy = 'SYSTEM' so admins can audit it. Doctors who consistently get
 * caught here should be flagged by an analytics job (not built here).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refundEscrow } from '@/lib/stripe'
import { sendAppointmentCancelled } from '@/lib/email'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 30 minutes after scheduledAt with no IN_PROGRESS = treated as a no-show.
const NO_SHOW_GRACE_MS = 30 * 60_000
const BATCH_LIMIT      = 100

function authed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}` ||
         req.headers.get('x-cron-secret') === secret
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cutoff = new Date(Date.now() - NO_SHOW_GRACE_MS)

  const stuck = await prisma.appointment.findMany({
    where: {
      status:      'SCHEDULED',
      scheduledAt: { lt: cutoff },
      escrow:      { is: { status: 'HELD' } },
    },
    include: {
      escrow:  true,
      doctor:  { include: { user: { select: { name: true, email: true } } } },
      patient: { include: { user: { select: { name: true, email: true } } } },
    },
    take:    BATCH_LIMIT,
    orderBy: { scheduledAt: 'asc' },
  })

  let refunded = 0
  let failed   = 0

  for (const a of stuck) {
    if (!a.escrow || a.escrow.status !== 'HELD') continue

    try {
      // Race-safe lock: only the runner whose update flips a still-SCHEDULED row wins.
      const lock = await prisma.appointment.updateMany({
        where: { id: a.id, status: 'SCHEDULED' },
        data:  { status: 'REFUNDED', cancelledAt: new Date(), cancelledBy: 'SYSTEM', cancellationReason: 'Doctor no-show — auto-refund' },
      })
      if (lock.count === 0) continue

      await refundEscrow(a.escrow.stripePaymentIntentId!)
      await prisma.escrow.update({
        where: { id: a.escrow.id },
        data:  { status: 'REFUNDED', refundedAt: new Date(), refundReason: 'Doctor no-show (auto)' },
      })

      void audit('appointment.cancel', 'Appointment', a.id, {
        actorId: 'system', actorRole: 'SYSTEM',
        refunded: true, amount: Number(a.escrow.amount),
        reason: 'doctor_no_show', cancelledBy: 'SYSTEM',
      })

      if (a.patient.user.email) {
        void sendAppointmentCancelled({
          to: a.patient.user.email,
          recipientName: a.patient.user.name ?? 'there',
          counterpartLabel: a.doctor?.user.name ? `Dr. ${a.doctor.user.name}` : 'your doctor',
          scheduledAt: a.scheduledAt,
          refundIssued: true,
        })
      }

      refunded++
    } catch (e) {
      failed++
      console.error('[cron.no-show] row failed', a.id, e)
      // Best-effort: revert the appointment lock so a future run can retry.
      await prisma.appointment.updateMany({
        where: { id: a.id, status: 'REFUNDED', cancelledBy: 'SYSTEM' },
        data:  { status: 'SCHEDULED', cancelledAt: null, cancelledBy: null, cancellationReason: null },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, considered: stuck.length, refunded, failed })
}
