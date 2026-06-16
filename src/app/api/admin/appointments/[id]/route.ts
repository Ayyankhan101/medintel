/**
 * GET /api/admin/appointments/[id] — full appointment snapshot for the
 * refund/dispute panel. Admin-only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(req, { key: 'admin-appointment', max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await ctx.params
  const appt = await prisma.appointment.findUnique({
    where:   { id },
    include: {
      patient: { include: { user: { select: { name: true, email: true, phone: true, medIntelCode: true } } } },
      doctor:  { include: { user: { select: { name: true, email: true } } } },
      escrow:  true,
    },
  })
  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(appt)
}
