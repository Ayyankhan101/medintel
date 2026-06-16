import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(_req, { key: 'doctor-by-id', max: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const { id } = await params
  const doctor = await prisma.doctor.findUnique({
    where:   { id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  return NextResponse.json(doctor)
}
