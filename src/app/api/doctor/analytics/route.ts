/**
 * GET /api/doctor/analytics?days=30
 *
 * Per-doctor clinical analytics for the authenticated doctor.
 * Returns outcome distribution, avg severity handled, specialty breakdown,
 * recovery rates, and earnings — all scoped to the signed-in doctor.
 *
 * No raw PHI — only aggregates safe to render in charts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function round(n: number, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(req, { key: 'doctor-analytics', max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  const days  = Math.max(1, Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10) || 30, 365))
  const since = new Date(Date.now() - days * 24 * 60 * 60_000)

  const [
    totalCompleted,
    totalCancelled,
    byStatus,
    byRecovery,
    bySeverity,
    byDepartment,
    avgSeverity,
    escrowAgg,
    recentAppts,
  ] = await Promise.all([
    prisma.appointment.count({ where: { doctorId: doctor.id, status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { doctorId: doctor.id, status: { in: ['CANCELLED', 'REFUNDED'] } } }),

    prisma.appointment.groupBy({
      by: ['status'],
      where: { doctorId: doctor.id, createdAt: { gte: since } },
      _count: true,
    }),

    prisma.appointment.groupBy({
      by: ['recoveryStatus'],
      where: { doctorId: doctor.id, status: 'COMPLETED', recoveryStatus: { not: null } },
      _count: true,
    }),

    prisma.appointment.groupBy({
      by: ['severityLevel'],
      where: { doctorId: doctor.id, createdAt: { gte: since }, severityLevel: { not: null } },
      _count: true,
    }),

    prisma.appointment.groupBy({
      by: ['department'],
      where: { doctorId: doctor.id, createdAt: { gte: since }, department: { not: null } },
      _count: true,
      orderBy: { _count: { department: 'desc' } },
      take: 8,
    }),

    prisma.appointment.aggregate({
      where: { doctorId: doctor.id, severityScore: { not: null }, createdAt: { gte: since } },
      _avg: { severityScore: true },
    }),

    prisma.escrow.aggregate({
      where: {
        appointment: { doctorId: doctor.id },
        status: 'RELEASED',
        releasedAt: { gte: since },
      },
      _sum: { amount: true },
      _count: true,
    }),

    prisma.appointment.findMany({
      where:   { doctorId: doctor.id, createdAt: { gte: since } },
      select:  { scheduledAt: true, status: true },
      orderBy: { scheduledAt: 'asc' },
    }),
  ])

  // Build a daily volume map for the sparkline (last `days` days).
  const volumeByDay: Record<string, number> = {}
  for (const a of recentAppts) {
    const key = a.scheduledAt.toISOString().slice(0, 10)
    volumeByDay[key] = (volumeByDay[key] ?? 0) + 1
  }
  const volumeSeries = Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * 86_400_000)
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: volumeByDay[key] ?? 0 }
  })

  const statusMap = Object.fromEntries(byStatus.map(r => [r.status, r._count]))
  const inWindow  = byStatus.reduce((s, r) => s + r._count, 0)
  const completed = statusMap.COMPLETED ?? 0
  const completionRate = inWindow > 0 ? round(completed / inWindow, 3) : 0

  const recoveryMap  = Object.fromEntries(byRecovery.map(r => [r.recoveryStatus ?? 'null', r._count]))
  const recoveryTotal = byRecovery.reduce((s, r) => s + r._count, 0)
  const improvedRate  = recoveryTotal > 0 ? round((recoveryMap.IMPROVED ?? 0) / recoveryTotal, 3) : null

  return NextResponse.json({
    windowDays: days,
    asOf:       new Date().toISOString(),
    doctor: {
      id:             doctor.id,
      specialization: doctor.specialization,
      tier:           doctor.tier,
      rating:         doctor.rating,
      reviewCount:    doctor.reviewCount,
    },
    overview: {
      totalCompletedAllTime: totalCompleted,
      totalCancelledAllTime: totalCancelled,
      inWindow,
      byStatus:        statusMap,
      completionRate,
    },
    severity: {
      avgScore:    round(Number(avgSeverity._avg.severityScore ?? 0), 2),
      byLevel:     Object.fromEntries(bySeverity.map(r => [r.severityLevel ?? 'UNKNOWN', r._count])),
    },
    recovery: {
      total:        recoveryTotal,
      byStatus:     recoveryMap,
      improvedRate,
    },
    departments: byDepartment.map(r => ({ name: r.department ?? 'Unknown', count: r._count })),
    earnings: {
      releasedInWindow: round(Number(escrowAgg._sum.amount ?? 0), 2),
      consultationsInWindow: escrowAgg._count,
      currency: 'PKR',
    },
    volumeSeries,
  })
}
