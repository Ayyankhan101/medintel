import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyDoctorTier1, verifyDoctorTier2 } from '@/lib/kyd'

const kydSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2)]),
  governmentId: z.string().optional(),
  licenseNumber: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'DOCTOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = kydSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const doctor = await prisma.doctor.findFirst({
    where: { user: { id: session.user.id } },
  })
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
  }

  if (parsed.data.tier === 1) {
    const result = await verifyDoctorTier1(parsed.data.governmentId ?? '')
    if (!result.passed) {
      return NextResponse.json({ error: result.reason }, { status: 422 })
    }
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { kydTier1At: new Date() },
    })
    return NextResponse.json({ tier: 1, passed: true })
  }

  if (parsed.data.tier === 2) {
    if (!doctor.kydTier1At) {
      return NextResponse.json({ error: 'Complete Tier 1 verification first' }, { status: 400 })
    }
    const result = await verifyDoctorTier2(parsed.data.licenseNumber ?? '')
    if (!result.passed) {
      return NextResponse.json({ error: result.reason }, { status: 422 })
    }
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { kydTier2At: new Date() },
    })
    return NextResponse.json({ tier: 2, passed: true })
  }

  return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
}
