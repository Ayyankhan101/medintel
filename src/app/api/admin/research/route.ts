/**
 * GET /api/admin/research?days=90
 *
 * Aggregated research analytics for the admin dashboard:
 *   - disease trends (dept counts by month)
 *   - treatment success by specialty
 *   - severity distribution
 *   - consent enrollment count
 *   - latest AI insight
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { captureError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const days  = Math.max(7, Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10) || 90, 730))
    const since = new Date(Date.now() - days * 24 * 60 * 60_000)

    const [consentCount, totalPatients] = await prisma.$transaction([
      prisma.patient.count({ where: { researchConsent: true } }),
      prisma.patient.count(),
    ])

    const [triagesByDept, triagesBySeverity, recoveryByDept, monthlyVolume, latestInsight] =
      await Promise.all([
        prisma.triage.groupBy({
          by: ['department'],
          where: { createdAt: { gte: since }, patient: { researchConsent: true } },
          _count: true,
          orderBy: { _count: { department: 'desc' } },
          take: 12,
        }),

        prisma.triage.groupBy({
          by: ['severityLevel'],
          where: { createdAt: { gte: since }, patient: { researchConsent: true } },
          _count: true,
          orderBy: { _count: { severityLevel: 'asc' } },
        }),

        prisma.appointment.groupBy({
          by: ['department', 'recoveryStatus'],
          where: {
            status: 'COMPLETED',
            recoveryStatus: { not: null },
            department: { not: null },
            createdAt: { gte: since },
            patient: { researchConsent: true },
          },
          _count: true,
          orderBy: { _count: { department: 'desc' } },
          take: 30,
        }),

        prisma.triage.findMany({
          where: { createdAt: { gte: since }, patient: { researchConsent: true } },
          select: { createdAt: true, severityScore: true },
          orderBy: { createdAt: 'asc' },
        }),

        prisma.researchInsight.findFirst({ orderBy: { generatedAt: 'desc' } }),
      ])

  // Build month-buckets for volume chart
  const monthMap: Record<string, { total: number; sumSeverity: number }> = {}
  for (const t of monthlyVolume) {
    const key = t.createdAt.toISOString().slice(0, 7) // YYYY-MM
    if (!monthMap[key]) monthMap[key] = { total: 0, sumSeverity: 0 }
    monthMap[key].total++
    monthMap[key].sumSeverity += t.severityScore
  }
  const volumeSeries = Object.entries(monthMap).map(([month, v]) => ({
    month,
    total:       v.total,
    avgSeverity: Math.round((v.sumSeverity / v.total) * 10) / 10,
  }))

  // Reshape recovery outcomes into dept → { IMPROVED, UNCHANGED, WORSE }
  const recoveryMap: Record<string, Record<string, number>> = {}
  for (const r of recoveryByDept) {
    if (!r.department || !r.recoveryStatus) continue
    if (!recoveryMap[r.department]) recoveryMap[r.department] = {}
    recoveryMap[r.department][r.recoveryStatus] = r._count
  }
  const recoveryByDeptArr = Object.entries(recoveryMap)
    .map(([dept, outcomes]) => ({
      dept,
      improved:  outcomes.IMPROVED  ?? 0,
      unchanged: outcomes.UNCHANGED ?? 0,
      worse:     outcomes.WORSE     ?? 0,
      total:     (outcomes.IMPROVED ?? 0) + (outcomes.UNCHANGED ?? 0) + (outcomes.WORSE ?? 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  return NextResponse.json({
    windowDays: days,
    asOf:       new Date().toISOString(),
    consent: {
      enrolled: consentCount,
      total:    totalPatients,
      rate:     totalPatients > 0 ? Math.round((consentCount / totalPatients) * 1000) / 10 : 0,
    },
    diseasesByDept:   triagesByDept.map(r => ({ dept: r.department, count: r._count })),
    severityBreakdown: Object.fromEntries(triagesBySeverity.map(r => [r.severityLevel, r._count])),
    recoveryByDept:   recoveryByDeptArr,
    volumeSeries,
    latestInsight: latestInsight ? {
      id:          latestInsight.id,
      generatedAt: latestInsight.generatedAt,
      totalCases:  latestInsight.totalCases,
      avgSeverity: latestInsight.avgSeverity,
      summary:     latestInsight.summary,
      keyFindings: latestInsight.keyFindings,
      topDiseases: latestInsight.topDiseases,
    } : null,
  })
  } catch (error) {
    captureError(error, { context: 'admin/research' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
