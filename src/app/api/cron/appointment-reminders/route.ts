/**
 * Cron — daily appointment reminders.
 *
 * Scheduled by vercel.json once daily at 07:00 UTC (Hobby plan cap = daily
 * granularity only). Selects SCHEDULED appointments whose start is within the
 * next 27 hours and that haven't been reminded yet — covers everyone who has
 * an appointment "today or tomorrow morning" with a single daily run.
 *
 * Why 27h: catches "tomorrow at 09:00" while still pruning anything > 27h
 * away. The reminderSentAt lock guarantees idempotency, so the upper bound
 * is just a sanity cap to keep the batch small.
 *
 * On Pro/Team plans, switch the vercel.json schedule to `*\/10 * * * *` and
 * narrow LEAD_MAX_MS to 75 * 60_000 to recover hour-of-day precision.
 *
 * Auth: Vercel attaches Authorization: Bearer ${CRON_SECRET} to scheduled
 * invocations. We accept that, OR a manual call with x-cron-secret for debug.
 */
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/sms'
import { sendAppointmentReminder } from '@/lib/email'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Daily run — scan 0 to 27h ahead, idempotent via reminderSentAt.
const LEAD_MIN_MS = 0
const LEAD_MAX_MS = 27 * 60 * 60_000
const BATCH_LIMIT = 200

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a); const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function authed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  if (safeEq(req.headers.get('authorization') ?? '', `Bearer ${secret}`)) return true
  if (safeEq(req.headers.get('x-cron-secret') ?? '', secret)) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = Date.now()
  const due = await prisma.appointment.findMany({
    where: {
      status:         'SCHEDULED',
      reminderSentAt: null,
      scheduledAt:    { gte: new Date(now + LEAD_MIN_MS), lte: new Date(now + LEAD_MAX_MS) },
    },
    include: {
      patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
      doctor:  { include: { user: { select: { name: true, email: true } } } },
    },
    take:    BATCH_LIMIT,
    orderBy: { scheduledAt: 'asc' },
  })

  let sent = 0
  let failed = 0

  for (const a of due) {
    if (!a.doctor) continue
    const patientName = a.patient.user.name ?? 'there'
    const doctorName  = a.doctor.user.name  ?? 'your doctor'
    const when        = a.scheduledAt.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })

    try {
      // Lock first to prevent a concurrent cron retry from double-sending.
      // updateMany with the reminderSentAt-null guard means only one runner wins.
      const lock = await prisma.appointment.updateMany({
        where: { id: a.id, reminderSentAt: null },
        data:  { reminderSentAt: new Date() },
      })
      if (lock.count === 0) continue   // someone else won the row

      // SMS to patient (Pakistan-first channel)
      if (a.patient.user.phone) {
        void sendSms(
          a.patient.user.phone,
          `MedIntel: Your consultation with Dr. ${doctorName} starts at ${when}. Join: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/consultation/${a.id}`,
        )
      }
      // Email to patient
      if (a.patient.user.email) {
        void sendAppointmentReminder({
          to:            a.patient.user.email,
          patientName,
          doctorName,
          scheduledAt:   a.scheduledAt,
          appointmentId: a.id,
        })
      }
      // Email to doctor — heads-up about next session
      if (a.doctor.user.email) {
        void sendAppointmentReminder({
          to:            a.doctor.user.email,
          patientName:   'your patient',
          doctorName,
          scheduledAt:   a.scheduledAt,
          appointmentId: a.id,
        })
      }

      sent++
    } catch (e) {
      failed++
      console.error('[cron.reminders] row failed', a.id, e)
    }
  }

  if (sent > 0) {
    void audit('cron.appointment_reminders', 'Cron', 'reminders', { sent, failed, considered: due.length })
  }

  return NextResponse.json({ ok: true, considered: due.length, sent, failed })
}
