import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doctor = await prisma.doctor.findUnique({
    where:   { id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  return NextResponse.json(doctor)
}
