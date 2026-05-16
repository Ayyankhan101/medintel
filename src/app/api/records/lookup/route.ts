import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
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

  // PMDC/Drugs-Act: a doctor may only read another patient's chart when an
  // active clinical relationship exists. Admins bypass for moderation.
  if (role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id! }, select: { id: true } })
    const link = doctor ? await prisma.appointment.findFirst({
      where: {
        patientId: user.patient.id,
        doctorId:  doctor.id,
        status:    { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
      },
      select: { id: true },
    }) : null
    if (!link) {
      // Audit the *refusal* too — repeated denied lookups are a red flag.
      void audit('records.lookup_denied', 'Patient', user.patient.id, {
        actorId: session.user.id, actorRole: role, reason: 'no_active_appointment',
      })
      return NextResponse.json({ error: 'No active appointment with this patient' }, { status: 403 })
    }
  }

  void audit('records.lookup', 'Patient', user.patient.id, {
    actorId: session.user.id, actorRole: role, medIntelCode,
  })

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
