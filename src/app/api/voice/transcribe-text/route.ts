import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SeverityLevel, Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runTextIntakePipeline } from '@/lib/openai'
import { rateLimitDb } from '@/lib/rate-limit'
import { captureError } from '@/lib/observability'

const schema = z.object({
  text: z.string().min(3),
})

// Global rate limit — across all users, max N requests per window.
const GLOBAL_MAX = 100
const GLOBAL_WINDOW_MS = 60_000
let globalCount = 0
let globalResetAt = Date.now() + GLOBAL_WINDOW_MS

function checkGlobalCap(): boolean {
  const now = Date.now()
  if (now > globalResetAt) {
    globalCount = 0
    globalResetAt = now + GLOBAL_WINDOW_MS
  }
  globalCount++
  return globalCount <= GLOBAL_MAX
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkGlobalCap()) {
    return NextResponse.json({ error: 'System at capacity — try again shortly' }, { status: 429 })
  }

  const rl = await rateLimitDb('voice-text', session.user.id!, { max: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited — slow down' }, { status: 429 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { text } = parsed.data

  const patient = await prisma.patient.findUnique({
    where: { userId: session.user.id },
    select: { id: true, dateOfBirth: true, gender: true, preferredLanguage: true },
  })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const patientContext = {
    age: patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined,
    gender: patient.gender ?? undefined,
    preferredLanguage: patient.preferredLanguage ?? undefined,
  }

  let result
  try {
    result = await runTextIntakePipeline(text, patientContext)
  } catch (e) {
    captureError(e, { context: 'voice/transcribe-text AI pipeline' })
    const { mapDepartment, scoreFromKeywords } = await import('@/lib/triage')
    const severityScore = scoreFromKeywords(text)
    const department    = mapDepartment(text)
    const severityLevel = severityScore <= 4 ? 'ROUTINE' : severityScore <= 7 ? 'URGENT' : 'CRITICAL'
    result = { transcript: text, summary: text, department, severityScore, severityLevel, isEmergency: severityScore >= 8, confidence: 0.3 }
  }

  const triage = await prisma.triage.create({
    data: {
      patientId:     patient.id,
      transcript:    result.transcript,
      summary:       result.summary,
      severityScore: result.severityScore,
      severityLevel: result.severityLevel as SeverityLevel,
      department:    result.department,
      rawOutput:     (result.rawOutput ?? undefined) as Prisma.InputJsonValue | undefined,
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
    confidence:    result.confidence,
  })
}
