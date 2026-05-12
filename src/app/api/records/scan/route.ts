import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ocrDocumentFromS3 } from '@/lib/textract'

const schema = z.object({
  s3Key:      z.string().min(1),
  type:       z.enum(['PRESCRIPTION', 'LAB_REPORT', 'SURGERY', 'ALLERGY', 'CHRONIC_MED']),
  title:      z.string().min(1),
  recordedAt: z.string().datetime(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findFirst({ where: { user: { id: session.user.id } } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const ocrText = await ocrDocumentFromS3(parsed.data.s3Key)

  const record = await prisma.medicalRecord.create({
    data: {
      patientId:  patient.id,
      type:       parsed.data.type,
      title:      parsed.data.title,
      content:    ocrText || 'OCR could not extract text from this document',
      fileUrl:    parsed.data.s3Key,
      ocrText,
      recordedAt: new Date(parsed.data.recordedAt),
    },
  })

  return NextResponse.json({ record, extractedText: ocrText }, { status: 201 })
}
