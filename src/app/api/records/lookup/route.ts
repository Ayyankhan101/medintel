import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'DOCTOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only doctors can look up patient records' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const medIntelCode = searchParams.get('code')
  if (!medIntelCode) return NextResponse.json({ error: 'MedIntel code is required' }, { status: 400 })

  const user = await prisma.user.findFirst({
    where:   { medIntelCode },
    include: {
      patient: {
        include: { medicalRecords: { orderBy: { recordedAt: 'desc' } } },
      },
    },
  })

  if (!user?.patient) {
    return NextResponse.json({ error: 'No patient found with this MedIntel code' }, { status: 404 })
  }

  const records = user.patient.medicalRecords
  const grouped = {
    SURGERY:      records.filter(r => r.type === 'SURGERY'),
    ALLERGY:      records.filter(r => r.type === 'ALLERGY'),
    CHRONIC_MED:  records.filter(r => r.type === 'CHRONIC_MED'),
    LAB_REPORT:   records.filter(r => r.type === 'LAB_REPORT'),
    PRESCRIPTION: records.filter(r => r.type === 'PRESCRIPTION'),
  }

  return NextResponse.json({
    medIntelCode,
    patientId:   user.patient.id,
    recordCount: records.length,
    grouped,
  })
}
