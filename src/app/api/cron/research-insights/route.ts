/**
 * GET /api/cron/research-insights
 *
 * Weekly cron (vercel.json: 0 2 * * 0 — 02:00 UTC Sunday ~= 07:00 PKT).
 * Pulls last 30 days of consented, anonymized triage data, sends to LLM for
 * pattern analysis, stores result in ResearchInsight. The admin research
 * dashboard reads the latest row instead of re-running LLM on each load.
 *
 * Guarded by CRON_SECRET (same header as other cron routes).
 */
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLlmClient, CHAT_MODEL } from '@/lib/llm-client'
import { audit } from '@/lib/audit'
import { captureError } from '@/lib/observability'

export const dynamic   = 'force-dynamic'
export const maxDuration = 120

const WINDOW_DAYS = 30
const MIN_CASES   = 5   // skip if too few data points to be meaningful

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a); const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function authed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return safeEq(req.headers.get('authorization') ?? '', `Bearer ${secret}`) ||
         safeEq(req.headers.get('x-cron-secret') ?? '', secret)
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60_000)

  const triages = await prisma.triage.findMany({
    where: {
      createdAt: { gte: since },
      patient:   { researchConsent: true },
    },
    select: {
      severityScore: true,
      severityLevel: true,
      department:    true,
      summary:       true,
      createdAt:     true,
      patient: {
        select: {
          dateOfBirth: true,
          gender:      true,
          appointments: {
            where:   { status: 'COMPLETED' },
            select:  { recoveryStatus: true },
            orderBy: { scheduledAt: 'desc' },
            take:    1,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take:    2_000,
  })

  if (triages.length < MIN_CASES) {
    return NextResponse.json({ ok: true, skipped: true, reason: `Only ${triages.length} consented cases — need ${MIN_CASES}` })
  }

  // Build compact anonymized summary for LLM
  const deptCounts: Record<string, number> = {}
  const levelCounts: Record<string, number> = {}
  const recoveryCounts: Record<string, number> = {}
  let totalSeverity = 0

  for (const t of triages) {
    deptCounts[t.department]   = (deptCounts[t.department]   ?? 0) + 1
    levelCounts[t.severityLevel] = (levelCounts[t.severityLevel] ?? 0) + 1
    totalSeverity += t.severityScore
    const recovery = t.patient.appointments[0]?.recoveryStatus
    if (recovery) recoveryCounts[recovery] = (recoveryCounts[recovery] ?? 0) + 1
  }

  const avgSeverity = totalSeverity / triages.length
  const topDepts    = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const prompt = `You are a clinical epidemiology analyst reviewing anonymized telemedicine data from Pakistan.

DATASET SUMMARY (last ${WINDOW_DAYS} days, ${triages.length} consented cases):

Chief complaints by specialty:
${topDepts.map(([d, c]) => `  ${d}: ${c} cases`).join('\n')}

Severity distribution:
${Object.entries(levelCounts).map(([l, c]) => `  ${l}: ${c}`).join('\n')}

Average severity score: ${avgSeverity.toFixed(2)} / 10

Recovery outcomes (where recorded):
${Object.entries(recoveryCounts).map(([r, c]) => `  ${r}: ${c}`).join('\n') || '  No outcomes recorded yet'}

Sample of recent clinical summaries (anonymized):
${triages.slice(0, 20).map((t, i) => `${i + 1}. [${t.department}] ${t.summary.slice(0, 150)}`).join('\n')}

Based on this data, provide a clinical research insight. Return a JSON object with these exact keys:
{
  "summary": "3-4 sentence executive summary of the key patterns",
  "keyFindings": ["finding 1", "finding 2", "finding 3", "finding 4", "finding 5"],
  "riskAlerts": ["any concerning trends worth flagging for public health"],
  "recommendations": ["actionable suggestions for the platform or healthcare system"]
}

Be factual. Use clinical language. Do not invent specific numbers not present in the data above.`

  const client = getLlmClient()
  let insight: { summary: string; keyFindings: string[]; riskAlerts?: string[]; recommendations?: string[] }

  try {
    const completion = await client.chat.completions.create({
      model:       CHAT_MODEL,
      temperature: 0.2,
      max_tokens:  1200,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    insight = JSON.parse(raw)
  } catch (e) {
    console.error('[cron.research-insights] LLM failed', e)
    captureError(e, { context: 'cron.research-insights LLM' })
    insight = {
      summary: `Automated analysis of ${triages.length} cases over ${WINDOW_DAYS} days. Average severity: ${avgSeverity.toFixed(1)}/10. Top department: ${topDepts[0]?.[0] ?? 'General Medicine'}.`,
      keyFindings: topDepts.slice(0, 5).map(([d, c]) => `${d}: ${c} cases in window`),
    }
  }

  const saved = await prisma.researchInsight.create({
    data: {
      windowDays:  WINDOW_DAYS,
      totalCases:  triages.length,
      avgSeverity,
      summary:     insight.summary ?? '',
      keyFindings: insight.keyFindings ?? [],
      topDiseases: topDepts.map(([dept, count]) => ({ dept, count })),
      modelUsed:   CHAT_MODEL,
    },
  })

  void audit('cron.research_insights', 'ResearchInsight', saved.id, {
    totalCases: triages.length, avgSeverity,
  })

  return NextResponse.json({ ok: true, insightId: saved.id, totalCases: triages.length })
}
