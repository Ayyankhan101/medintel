/**
 * GET /api/admin/moderation — three queues that need admin attention:
 *
 *  1. unmatched_critical : CRITICAL triages with no appointment within 2h
 *  2. doctor_no_show     : doctors with ≥3 SYSTEM cancellations in last 30d
 *  3. recent_disputes    : last 50 cancellations with non-empty reason
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const NO_SHOW_THRESHOLD = 3
const LOOKBACK_DAYS     = 30

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const since   = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60_000)
  const twoHrs  = new Date(Date.now() - 2 * 60 * 60_000)

  // 1. CRITICAL triages where the patient still has no SCHEDULED+ appointment.
  const criticals = await prisma.triage.findMany({
    where:   { severityLevel: 'CRITICAL', createdAt: { gte: twoHrs } },
    include: { patient: { include: { user: { select: { name: true, email: true, phone: true, medIntelCode: true } } } } },
    orderBy: { createdAt: 'desc' },
    take:    100,
  })
  // Filter out those who did book — single round-trip via groupBy on appointments.
  const patientIds = criticals.map(t => t.patientId)
  const booked = patientIds.length
    ? await prisma.appointment.findMany({
        where:   { patientId: { in: patientIds }, createdAt: { gte: twoHrs } },
        select:  { patientId: true },
        distinct: ['patientId'],
      })
    : []
  const bookedSet = new Set(booked.map(b => b.patientId))
  const unmatchedCritical = criticals.filter(t => !bookedSet.has(t.patientId))

  // 2. Doctors with repeated system cancellations.
  const grouped = await prisma.appointment.groupBy({
    by:      ['doctorId'],
    where:   { cancelledBy: 'SYSTEM', cancelledAt: { gte: since }, doctorId: { not: null } },
    _count:  { _all: true },
    having:  { doctorId: { _count: { gte: NO_SHOW_THRESHOLD } } },
    orderBy: { _count: { doctorId: 'desc' } },
    take:    25,
  })
  const noShowDoctors = grouped.length
    ? await prisma.doctor.findMany({
        where:   { id: { in: grouped.map(g => g.doctorId!) } },
        include: { user: { select: { name: true, email: true } } },
      }).then(rows => rows.map(d => ({
        ...d,
        noShowCount: grouped.find(g => g.doctorId === d.id)?._count._all ?? 0,
      })))
    : []

  // 3. Recent disputes (manual cancellations with a reason captured).
  const disputes = await prisma.appointment.findMany({
    where: {
      cancelledAt:        { gte: since },
      cancellationReason: { not: null },
      cancelledBy:        { in: ['PATIENT', 'ADMIN'] },
    },
    include: {
      patient: { include: { user: { select: { name: true, email: true } } } },
      doctor:  { include: { user: { select: { name: true } } } },
      escrow:  { select: { status: true, amount: true, refundedAmount: true } },
    },
    orderBy: { cancelledAt: 'desc' },
    take:    50,
  })

  return NextResponse.json({
    unmatchedCritical,
    noShowDoctors,
    disputes,
    generatedAt: new Date(),
  })
}
