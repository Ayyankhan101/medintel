'use client'
import { useEffect, useState } from 'react'
import { FlaskConical, TrendingUp, Heart, BarChart2, Download, ChevronDown, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/design/GlassCard'

interface ResearchData {
  windowDays: number
  asOf: string
  consent: { enrolled: number; total: number; rate: number }
  diseasesByDept: { dept: string; count: number }[]
  severityBreakdown: Record<string, number>
  recoveryByDept: { dept: string; improved: number; unchanged: number; worse: number; total: number }[]
  volumeSeries: { month: string; total: number; avgSeverity: number }[]
  latestInsight: {
    id: string
    generatedAt: string
    totalCases: number
    avgSeverity: number
    summary: string
    keyFindings: string[]
    topDiseases: unknown
  } | null
}

const DAYS_OPTIONS = [30, 90, 180, 365]

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-2)', minWidth: 130, flexShrink: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 600ms var(--ease-out-quart)' }} />
      </div>
      <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)', minWidth: 32, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

function VolumeChart({ series }: { series: { month: string; total: number; avgSeverity: number }[] }) {
  if (!series.length) return <p style={{ fontSize: 'var(--text-base)', color: 'var(--ink-4)', margin: 0 }}>No data</p>
  const maxTotal = Math.max(...series.map(s => s.total), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
      {series.map(s => {
        const h = Math.max(4, (s.total / maxTotal) * 80)
        return (
          <div key={s.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              style={{ width: '100%', height: h, background: 'var(--blue-600)', borderRadius: '4px 4px 0 0', opacity: 0.8 }}
              title={`${s.month}: ${s.total} cases, avg severity ${s.avgSeverity}`}
            />
            <span style={{ fontSize: 9, color: 'var(--ink-4)', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
              {s.month.slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RecoveryTable({ rows }: { rows: ResearchData['recoveryByDept'] }) {
  if (!rows.length) return <p style={{ fontSize: 'var(--text-base)', color: 'var(--ink-4)', margin: 0 }}>No recovery data yet</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => {
        const improvedPct = r.total > 0 ? Math.round((r.improved / r.total) * 100) : 0
        return (
          <div key={r.dept} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', fontWeight: 500 }}>{r.dept}</span>
              <span style={{ fontSize: 'var(--text-xs)', color: '#047857', fontWeight: 700 }}>{improvedPct}% improved</span>
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', gap: 1 }}>
              <div style={{ flex: r.improved,  background: '#059669' }} />
              <div style={{ flex: r.unchanged, background: '#d97706' }} />
              <div style={{ flex: r.worse,     background: '#dc2626' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 'var(--text-xs)', color: 'var(--ink-4)' }}>
              <span>✓ {r.improved}</span>
              <span>– {r.unchanged}</span>
              <span>↓ {r.worse}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Shimmer() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          height: 200, borderRadius: 18,
          background: 'linear-gradient(90deg, var(--bg-soft) 0%, var(--bg-elev) 50%, var(--bg-soft) 100%)',
          backgroundSize: '200% 100%',
          animation: 'mi-shimmer 1.4s linear infinite',
          border: '1px solid var(--border)',
        }} />
      ))}
    </div>
  )
}

export default function AdminResearchPage() {
  const [data,    setData]    = useState<ResearchData | null>(null)
  const [days,    setDays]    = useState(90)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/research?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  async function downloadExport() {
    setExporting(true)
    try {
      const r = await fetch(`/api/admin/research/export?days=${days}`)
      if (!r.ok) { alert('Export failed'); return }
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `medintel-research-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 28,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 'var(--text-xxs)', fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>Admin</span>
          <h1 style={{ margin: '4px 0 0', fontSize: 'var(--text-heading)', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={24} style={{ color: 'var(--violet-600)' }} /> Research
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-base)', color: 'var(--ink-3)' }}>
            Anonymized clinical data from consenting patients
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              style={{
                appearance: 'none', padding: '8px 32px 8px 12px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-elev)', color: 'var(--ink)',
                fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer', outline: 'none',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {DAYS_OPTIONS.map(d => <option key={d} value={d}>Last {d} days</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
          </div>
          <button
            onClick={downloadExport}
            disabled={exporting || loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-elev)', color: 'var(--ink-2)',
                fontSize: 'var(--text-base)', fontWeight: 600, cursor: exporting ? 'wait' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export JSON'}
          </button>
        </div>
      </header>

      {loading && <Shimmer />}

      {!loading && data && (
        <>
          {/* Consent KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { label: 'Consented patients', value: data.consent.enrolled, sub: `${data.consent.rate}% of total`, color: 'var(--violet-600)', bg: 'rgba(139,92,246,.10)' },
              { label: 'Triages in window',  value: data.diseasesByDept.reduce((s, d) => s + d.count, 0), sub: `Last ${days} days`, color: 'var(--blue-700)', bg: 'rgba(37,99,235,.10)' },
              { label: 'Critical cases',     value: data.severityBreakdown.CRITICAL ?? 0, sub: 'Severity 8–10', color: '#b91c1c', bg: 'rgba(220,38,38,.08)' },
              { label: 'Outcomes recorded',  value: data.recoveryByDept.reduce((s, r) => s + r.total, 0), sub: 'IMPROVED / UNCHANGED / WORSE', color: '#047857', bg: 'rgba(16,185,129,.12)' },
            ].map(c => (
              <GlassCard key={c.label} padding={18} hover style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.bg, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FlaskConical size={16} style={{ color: c.color }} />
                </div>
                <p className="mono" style={{ margin: 0, fontSize: 'var(--text-hero)', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</p>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-base)', color: 'var(--ink-3)' }}>{c.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--ink-4)' }}>{c.sub}</p>
              </GlassCard>
            ))}
          </div>

          {/* AI Insight */}
          {data.latestInsight && (
            <GlassCard as="section" tone="violet" padding={22} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} style={{ color: 'var(--violet-600)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)' }}>AI Research Insight</h2>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--ink-4)' }}>
                  {new Date(data.latestInsight.generatedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} · {data.latestInsight.totalCases} cases
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-base)', color: 'var(--ink-2)', lineHeight: 1.6 }}>{data.latestInsight.summary}</p>
              {data.latestInsight.keyFindings.length > 0 && (
                <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.latestInsight.keyFindings.map((f, i) => (
                    <li key={i} style={{ fontSize: 'var(--text-base)', color: 'var(--ink-2)', lineHeight: 1.5 }}>{f}</li>
                  ))}
                </ul>
              )}
            </GlassCard>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

            {/* Disease distribution */}
            <GlassCard as="section" padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={15} style={{ color: 'var(--ink-3)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)' }}>Disease distribution</h2>
              </div>
              {data.diseasesByDept.length === 0
                ? <p style={{ fontSize: 'var(--text-base)', color: 'var(--ink-4)', margin: 0 }}>No data</p>
                : data.diseasesByDept.map(d => (
                  <BarRow key={d.dept} label={d.dept} count={d.count} max={data.diseasesByDept[0].count} color="var(--blue-600)" />
                ))}
            </GlassCard>

            {/* Severity */}
            <GlassCard as="section" padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={15} style={{ color: 'var(--ink-3)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)' }}>Severity breakdown</h2>
              </div>
              {(['CRITICAL', 'URGENT', 'ROUTINE'] as const).map(lvl => {
                const count = data.severityBreakdown[lvl] ?? 0
                const total = Object.values(data.severityBreakdown).reduce((a, b) => a + b, 0)
                const color = lvl === 'CRITICAL' ? '#dc2626' : lvl === 'URGENT' ? '#d97706' : '#059669'
                return <BarRow key={lvl} label={lvl} count={count} max={total} color={color} />
              })}
            </GlassCard>

            {/* Recovery by dept */}
            <GlassCard as="section" padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Heart size={15} style={{ color: 'var(--ink-3)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)' }}>Treatment success by specialty</h2>
              </div>
              <RecoveryTable rows={data.recoveryByDept} />
            </GlassCard>
          </div>

          {/* Monthly volume */}
          <GlassCard as="section" padding={20} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} style={{ color: 'var(--ink-3)' }} />
              <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)' }}>Monthly case volume</h2>
            </div>
            <VolumeChart series={data.volumeSeries} />
          </GlassCard>
        </>
      )}
    </div>
  )
}
