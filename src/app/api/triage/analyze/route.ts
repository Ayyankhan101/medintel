import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeScore, computeSeverityLevel, mapDepartment } from '@/lib/triage'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { patient: { include: { user: true } } },
  })

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (appointment.patient.user.id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const textToScore  = `${appointment.aiSummary ?? ''} ${appointment.transcript ?? ''}`
  const severityScore = appointment.severityScore ?? computeScore(textToScore)
  const severityLevel = computeSeverityLevel(severityScore)
  const department    = appointment.department ?? mapDepartment(textToScore)

  await prisma.appointment.update({
    where: { id: appointment.id },
    data:  { severityScore, severityLevel, department },
  })

  return NextResponse.json({
    severityScore,
    severityLevel,
    department,
    isEmergency: severityScore >= 8,
  })
}
