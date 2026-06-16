import { NextRequest, NextResponse } from 'next/server'
import { SeverityLevel, Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runFullIntakePipeline } from '@/lib/openai'
import { rateLimitDb } from '@/lib/rate-limit'

const MAX_BYTES = 25 * 1024 * 1024

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

  const rl = await rateLimitDb('voice', session.user.id!, { max: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited — slow down' }, { status: 429 })

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

  let audioBuffer: Buffer
  let filename = 'recording.webm'
  let language = 'ur'
  const ALLOWED_LANG = new Set(['ur', 'ps', 'pa', 'sd', 'en'])
  try {
    const form = await req.formData()
    const lang = form.get('language')
    if (typeof lang === 'string' && ALLOWED_LANG.has(lang)) language = lang
    const file = form.get('audio')
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty audio file' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Audio file too large' }, { status: 413 })
    }
    if (file instanceof File && file.name) filename = file.name
    audioBuffer = Buffer.from(await file.arrayBuffer())
  } catch (e) {
    console.error('[transcribe] form parse error:', e)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  let result
  try {
    result = await runFullIntakePipeline(audioBuffer, filename, language, patientContext)
  } catch (e) {
    console.error('[transcribe] AI pipeline error:', e)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
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
