/**
 * POST /api/appointments/[id]/consent — patient records recording consent.
 *
 * One-shot, idempotent. Required before the video session can mint a Twilio
 * token. Audit-logged because consent is a legal artifact.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PATIENT')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const appt = await prisma.appointment.findUnique({
    where:   { id },
    include: { patient: { include: { user: { select: { id: true } } } } },
  })
  if (!appt || appt.patient.user.id !== session.user.id)
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  // Idempotent — keep the original consent timestamp on repeat calls.
  if (appt.recordingConsentAt) return NextResponse.json({ consentedAt: appt.recordingConsentAt })

  const now = new Date()
  await prisma.appointment.update({ where: { id }, data: { recordingConsentAt: now } })
  void audit('appointment.consent', 'Appointment', id, {
    actorId: session.user.id, actorRole: 'PATIENT', consentedAt: now.toISOString(),
  })
  return NextResponse.json({ consentedAt: now })
}
