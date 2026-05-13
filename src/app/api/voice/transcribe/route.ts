import { NextRequest, NextResponse } from 'next/server'
import { SeverityLevel } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runFullIntakePipeline } from '@/lib/openai'

// 25 MB — well above a few minutes of webm/opus, but bounded to avoid abuse.
const MAX_BYTES = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  let audioBuffer: Buffer
  let filename = 'recording.webm'
  try {
    const form = await req.formData()
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
    result = await runFullIntakePipeline(audioBuffer, filename)
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
