import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDoctorVerificationDecision } from '@/lib/email'

const schema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve'),  trustBadge: z.boolean().optional() }),
  z.object({ decision: z.literal('reject'),   reason: z.string().min(3).max(400) }),
])

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const doctor = await prisma.doctor.findUnique({
    where:   { id },
    include: { user: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  if (parsed.data.decision === 'approve') {
    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        kydStatus:    'VERIFIED',
        kydTier2At:   new Date(),
        kydTier3At:   parsed.data.trustBadge ? new Date() : doctor.kydTier3At,
        trustBadge:   parsed.data.trustBadge ?? doctor.trustBadge,
      },
    })
    void sendDoctorVerificationDecision({
      to:         doctor.user.email,
      doctorName: doctor.user.name ?? 'Doctor',
      approved:   true,
    })
    return NextResponse.json(updated)
  }

  // reject
  const updated = await prisma.doctor.update({
    where: { id },
    data:  { kydStatus: 'REJECTED' },
  })
  void sendDoctorVerificationDecision({
    to:         doctor.user.email,
    doctorName: doctor.user.name ?? 'Doctor',
    approved:   false,
    reason:     parsed.data.reason,
  })
  return NextResponse.json(updated)
}
