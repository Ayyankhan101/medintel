import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(req, { key: 'triage-cleanup', max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const triage = await prisma.triage.findUnique({ where: { id } })
  if (!triage) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient || triage.patientId !== patient.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.triage.update({
    where: { id },
    data: { transcript: '' },
  })

  return NextResponse.json({ ok: true })
}
