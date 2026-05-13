import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { SeverityLevel } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runFullIntakePipeline } from '@/lib/openai'

const schema = z.object({
  s3Key: z.string().min(1),
})

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { s3Key } = parsed.data

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: s3Key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  const audioBuffer = Buffer.concat(chunks)
  const filename = s3Key.split('/').pop() ?? 'audio.webm'

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
      voiceFileUrl:  s3Key,
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
