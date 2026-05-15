/**
 * GET /api/admin/appointments/[id] — full appointment snapshot for the
 * refund/dispute panel. Admin-only.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
