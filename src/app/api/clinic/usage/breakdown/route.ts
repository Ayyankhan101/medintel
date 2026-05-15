/**
 * GET /api/clinic/usage/breakdown — per-doctor stats for the calling clinic.
 *
 * Window: last 30 days. Returns one row per doctor in the clinic with
 * completed / cancelled / no-show counts and total escrow released (revenue).
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const LOOKBACK_DAYS = 30

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const clinic = await prisma.clinic.findUnique({
    where:  { ownerUserId: session.user.id },
    select: { id: true },
  })
  if (!clinic) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  const since   = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60_000)
  const doctors = await prisma.doctor.findMany({
    where:   { clinicId: clinic.id },
    include: {
      user: { select: { name: true, email: true } },
      appointments: {
        where:  { createdAt: { gte: since } },
        select: { status: true, cancelledBy: true, escrow: { select: { status: true, amount: true, refundedAmount: true } } },
      },
    },
    orderBy: { user: { name: 'asc' } },
  })

  const rows = doctors.map(d => {
    let completed = 0, cancelled = 0, noShow = 0, refunded = 0
    let revenuePkr = 0

    for (const a of d.appointments) {
      if (a.status === 'COMPLETED') completed++
      else if (a.status === 'CANCELLED') cancelled++
      else if (a.status === 'REFUNDED') refunded++

      if (a.cancelledBy === 'SYSTEM') noShow++

      // Doctor's 90% cut of released-and-not-refunded escrow.
      if (a.escrow && a.escrow.status === 'RELEASED') {
        const refundedAmt = a.escrow.refundedAmount ? Number(a.escrow.refundedAmount) : 0
        revenuePkr += Math.floor((Number(a.escrow.amount) - refundedAmt) * 0.9)
      }
    }

    return {
      doctorId:       d.id,
      name:           d.user.name ?? '—',
      email:          d.user.email,
      specialization: d.specialization,
      rating:         d.rating ? Number(d.rating) : null,
      reviewCount:    d.reviewCount,
      completed,
      cancelled,
      refunded,
      noShow,
      revenuePkr,
    }
  })

  return NextResponse.json({ since, rows })
}
