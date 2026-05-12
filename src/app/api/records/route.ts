import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  type:       z.enum(['PRESCRIPTION', 'LAB_REPORT', 'SURGERY', 'ALLERGY', 'CHRONIC_MED']),
  title:      z.string().min(1),
  content:    z.string().min(1),
  fileUrl:    z.string().optional(),
  recordedAt: z.string().datetime(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({ where: { user: { id: session.user.id } } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const records = await prisma.medicalRecord.findMany({
    where:   { patientId: patient.id },
    orderBy: { recordedAt: 'desc' },
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findFirst({ where: { user: { id: session.user.id } } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const record = await prisma.medicalRecord.create({
    data: {
      ...parsed.data,
      patientId:  patient.id,
      recordedAt: new Date(parsed.data.recordedAt),
    },
  })

  return NextResponse.json(record, { status: 201 })
}
