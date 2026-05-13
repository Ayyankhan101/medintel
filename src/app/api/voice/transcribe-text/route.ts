import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runTextIntakePipeline } from '@/lib/openai'

const schema = z.object({
  text: z.string().min(3),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { text } = parsed.data

  let result
  try {
    result = await runTextIntakePipeline(text)
  } catch (e) {
    console.error('[transcribe-text] AI pipeline error:', e)
    const { parseDepartmentFromSummary, parseSeverityFromText } = await import('@/lib/openai')
    const severityScore = parseSeverityFromText(text)
    const department    = parseDepartmentFromSummary(text)
    const severityLevel = severityScore <= 4 ? 'ROUTINE' : severityScore <= 7 ? 'URGENT' : 'CRITICAL'
    result = { transcript: text, summary: text, department, severityScore, severityLevel, isEmergency: severityScore >= 8 }
  }

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const triage = await prisma.triage.create({
    data: {
      patientId:     patient.id,
      transcript:    result.transcript,
      summary:       result.summary,
      severityScore: result.severityScore,
      severityLevel: result.severityLevel,
      department:    result.department,
    },
  })

  return NextResponse.json({
    triageId:      triage.id,
    transcript:    result.transcript,
    summary:       result.summary,
    department:    result.department,
    severityScore: result.severityScore,
    severityLevel: result.severityLevel,
    isEmergency:   result.isEmergency,
  })
}
