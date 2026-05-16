/**
 * GET /api/admin/metrics?days=30
 *
 * Operator dashboard aggregations. Cheap counts + ratios computed in Prisma
 * (no schema migrations needed). Covers the bare minimum a launch reviewer
 * asks about: signups, conversion, refunds, no-shows, triage accuracy proxy,
 * online-doctor count.
 *
 * No raw PHI — only counts. Safe to log + safe to render in a list view.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const days  = Math.max(1, Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10) || 30, 365))
  const since = new Date(Date.now() - days * 24 * 60 * 60_000)
  const STALE_MS = 3 * 60_000

  const [
    totalUsers, newUsers, totalPatients, totalDoctors, verifiedDoctors,
    onlineDoctors, totalAppts, apptsByStatus, escrowsAgg, refundedEscrows,
    avgSeverity, criticalTriages, totalTriages, recentTriages,
    avgFee, totalReviews, avgRating,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.doctor.count({ where: { kydStatus: 'VERIFIED' } }),
    prisma.doctor.count({ where: { isOnline: true, lastSeenAt: { gt: new Date(Date.now() - STALE_MS) } } }),
    prisma.appointment.count(),
    prisma.appointment.groupBy({ by: ['status'], _count: true, where: { createdAt: { gte: since } } }),
    prisma.escrow.aggregate({ _sum: { amount: true }, _count: true, where: { heldAt: { gte: since } } }),
    prisma.escrow.count({ where: { status: 'REFUNDED', heldAt: { gte: since } } }),
    prisma.triage.aggregate({ _avg: { severityScore: true } }),
    prisma.triage.count({ where: { severityLevel: 'CRITICAL', createdAt: { gte: since } } }),
    prisma.triage.count(),
    prisma.triage.count({ where: { createdAt: { gte: since } } }),
    prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ])

  const apptStatus = Object.fromEntries(apptsByStatus.map(r => [r.status, r._count]))
  const completed  = apptStatus.COMPLETED ?? 0
  const cancelled  = apptStatus.CANCELLED ?? 0
  const refunded   = apptStatus.REFUNDED  ?? 0
  const scheduled  = apptStatus.SCHEDULED ?? 0
  const apptsTotalInWindow = completed + cancelled + refunded + scheduled + (apptStatus.IN_PROGRESS ?? 0)
  const completionRate = apptsTotalInWindow > 0 ? completed / apptsTotalInWindow : 0
  const noShowRate     = apptsTotalInWindow > 0 ? (cancelled + refunded) / apptsTotalInWindow : 0
  const refundRate     = (escrowsAgg._count ?? 0) > 0 ? refundedEscrows / (escrowsAgg._count ?? 1) : 0

  return NextResponse.json({
    windowDays: days,
    asOf:       new Date().toISOString(),

    users: {
      total: totalUsers,
      newInWindow: newUsers,
      patients: totalPatients,
      doctors:  totalDoctors,
      doctorsVerified: verifiedDoctors,
      doctorsOnlineNow: onlineDoctors,
    },

    appointments: {
      total: totalAppts,
      byStatusInWindow: apptStatus,
      completionRate: round(completionRate, 3),
      noShowRate:     round(noShowRate,     3),
    },

    revenue: {
      grossInWindow:    Number(escrowsAgg._sum.amount ?? 0),
      escrowsInWindow:  escrowsAgg._count ?? 0,
      refundedInWindow: refundedEscrows,
      refundRate:       round(refundRate, 3),
      avgConsultationFee: round(Number(avgFee._avg.consultationFee ?? 0), 2),
      currency:         'PKR',
    },

    triage: {
      total:      totalTriages,
      inWindow:   recentTriages,
      avgSeverityScore: round(Number(avgSeverity._avg.severityScore ?? 0), 2),
      criticalInWindow: criticalTriages,
    },

    quality: {
      reviews:   totalReviews,
      avgRating: round(Number(avgRating._avg.rating ?? 0), 2),
    },
  })
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}
