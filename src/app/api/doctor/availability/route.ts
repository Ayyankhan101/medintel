import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AvailabilitySchema, parseAvailability } from '@/lib/availability'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  return NextResponse.json({ availability: parseAvailability(doctor.availability) })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body   = await req.json()
  const parsed = AvailabilitySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  await prisma.doctor.update({
    where: { id: doctor.id },
    data:  { availability: parsed.data },
  })
  return NextResponse.json({ availability: parsed.data })
}
