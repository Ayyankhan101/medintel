import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function fmt(d: Date): string {
  // RFC 5545 floating UTC format: 20251231T235959Z
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
function escapeIcs(s: string): string {
  return s.replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n')
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const appt = await prisma.appointment.findUnique({
    where:   { id },
    include: { doctor: { include: { user: { select: { name: true, email: true } } } }, patient: { include: { user: { select: { email: true } } } } },
  })
  if (!appt)                                          return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (appt.patient.user.email !== session.user.email && appt.doctor?.user.email !== session.user.email && session.user.role !== 'ADMIN')
                                                       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const start = appt.scheduledAt
  const end   = new Date(start.getTime() + 30 * 60_000)
  const url   = `${process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? ''}/consultation/${appt.id}`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedIntel//Telemedicine//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appt.id}@medintel.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeIcs(`MedIntel consultation${appt.doctor?.user.name ? ' with ' + appt.doctor.user.name : ''}`)}`,
    `DESCRIPTION:${escapeIcs('Join your video consultation at ' + url)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'content-type':        'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="medintel-${appt.id.slice(0, 8)}.ics"`,
    },
  })
}
