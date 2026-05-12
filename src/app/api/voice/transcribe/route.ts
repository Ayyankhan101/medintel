import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runFullIntakePipeline } from '@/lib/openai'

const schema = z.object({
  s3Key: z.string().min(1),
  appointmentId: z.string().min(1),
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

  const { s3Key, appointmentId } = parsed.data

  const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: s3Key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  const audioBuffer = Buffer.concat(chunks)
  const filename = s3Key.split('/').pop() ?? 'audio.webm'

  const result = await runFullIntakePipeline(audioBuffer, filename)

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      voiceFileUrl: s3Key,
      transcript:   result.transcript,
      aiSummary:    result.summary,
      severityScore: result.severityScore,
      severityLevel: result.severityLevel,
      department:   result.department,
    },
  })

  return NextResponse.json({
    transcript:    result.transcript,
    summary:       result.summary,
    department:    result.department,
    severityScore: result.severityScore,
    severityLevel: result.severityLevel,
    isEmergency:   result.isEmergency,
  })
}
