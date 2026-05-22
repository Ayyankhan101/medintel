/**
 * GET /api/admin/research/export?days=90&format=json
 *
 * Anonymized bulk export for research. Only includes patients who gave
 * researchConsent. All direct identifiers are stripped — no name, email,
 * CNIC, phone, medIntelCode, address. What remains:
 *   age band, gender, city (province only in future), severity, department,
 *   recovery outcome, prescription keywords (not full text).
 *
 * Rate-limit: 5/hour. Admin only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimitDb } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function ageBand(dob: Date | null): string {
  if (!dob) return 'unknown'
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60_000))
  if (age < 0)   return 'unknown'
  if (age < 12)  return '0-11'
  if (age < 18)  return '12-17'
  if (age < 30)  return '18-29'
  if (age < 45)  return '30-44'
  if (age < 60)  return '45-59'
  if (age < 75)  return '60-74'
  return '75+'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const rl = await rateLimitDb('research-export', session.user.id!, { max: 5, windowMs: 60 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited. Try again in an hour.' }, { status: 429 })

  const days  = Math.max(1, Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '90', 10) || 90, 730))
  const since = new Date(Date.now() - days * 24 * 60 * 60_000)

  const triages = await prisma.triage.findMany({
    where: {
      createdAt: { gte: since },
      patient:   { researchConsent: true },
    },
    select: {
      id:            true,
      severityScore: true,
      severityLevel: true,
      department:    true,
      createdAt:     true,
      patient: {
        select: {
          dateOfBirth: true,
          gender:      true,
          appointments: {
            where:   { status: 'COMPLETED', createdAt: { gte: since } },
            select:  { recoveryStatus: true, department: true },
            orderBy: { scheduledAt: 'desc' },
            take:    1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take:    10_000,
  })

  const records = triages.map(t => ({
    triageId:       t.id,
    date:           t.createdAt.toISOString().slice(0, 10),
    ageBand:        ageBand(t.patient.dateOfBirth),
    gender:         t.patient.gender ?? 'unknown',
    severityScore:  t.severityScore,
    severityLevel:  t.severityLevel,
    department:     t.department,
    recoveryStatus: t.patient.appointments[0]?.recoveryStatus ?? null,
  }))

  // Aggregate summary alongside raw records
  const deptCounts: Record<string, number> = {}
  const recoveryCounts: Record<string, number> = {}
  let totalSeverity = 0

  for (const r of records) {
    deptCounts[r.department] = (deptCounts[r.department] ?? 0) + 1
    totalSeverity += r.severityScore
    if (r.recoveryStatus) {
      recoveryCounts[r.recoveryStatus] = (recoveryCounts[r.recoveryStatus] ?? 0) + 1
    }
  }

  const topDepartments = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dept, count]) => ({ dept, count }))

  const bundle = {
    exportedAt:     new Date().toISOString(),
    windowDays:     days,
    totalRecords:   records.length,
    consentBasis:   'Patient opt-in researchConsent field',
    anonymization:  'Name, email, CNIC, phone, medIntelCode, address removed. Age bucketed.',
    summary: {
      avgSeverityScore: records.length > 0 ? Math.round((totalSeverity / records.length) * 100) / 100 : 0,
      topDepartments,
      recoveryOutcomes: recoveryCounts,
    },
    records,
  }

  void audit('research.export', 'Admin', session.user.id!, {
    actorId: session.user.id, actorRole: 'ADMIN',
    recordCount: records.length, windowDays: days,
  })

  const filename = `medintel-research-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status:  200,
    headers: {
      'content-type':        'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control':       'no-store',
    },
  })
}
