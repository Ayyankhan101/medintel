'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/client'
import {
  TrendingUp, Activity, Heart, Users,
  BarChart2, DollarSign, ChevronDown,
} from 'lucide-react'

interface Analytics {
  windowDays: number
  asOf: string
  doctor: { specialization: string; tier: string; rating: unknown; reviewCount: number }
  overview: {
    totalCompletedAllTime: number
    inWindow: number
    byStatus: Record<string, number>
    completionRate: number
  }
  severity: {
    avgScore: number
    byLevel: Record<string, number>
  }
  recovery: {
    total: number
    byStatus: Record<string, number>
    improvedRate: number | null
  }
  departments: { name: string; count: number }[]
  earnings: { releasedInWindow: number; consultationsInWindow: number; currency: string }
  volumeSeries: { date: string; count: number }[]
}

const DAYS_OPTIONS = [7, 14, 30, 90]

const CARD_TONES = {
  blue:    { bg: 'rgba(37,99,235,.10)',  fg: 'var(--blue-700)' },
  violet:  { bg: 'rgba(139,92,246,.10)', fg: 'var(--violet-600)' },
  emerald: { bg: 'rgba(16,185,129,.12)', fg: '#047857' },
  amber:   { bg: 'rgba(245,158,11,.12)', fg: '#a16207' },
} as const

type Tone = keyof typeof CARD_TONES

function StatCard({
  icon: Icon, label, value, sub, tone,
}: { icon: React.ComponentType<{ size?: number }>; label: string; value: string | number; sub?: string; tone: Tone }) {
  const t = CARD_TONES[tone]
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <span style={{
        width: 42, height: 42, borderRadius: 13,
        background: t.bg, color: t.fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} />
      </span>
      <div>
        <p className="mono" style={{ margin: 0, fontSize: 30, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-.01em' }}>
          {value}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>{sub}</p>}
      </div>
    </div>
  )
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-2)', minWidth: 120, flexShrink: 0, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-soft)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 600ms var(--ease-out-quart)' }} />
      </div>
      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', minWidth: 28, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

function Sparkline({ series }: { series: { date: string; count: number }[] }) {
  const max = Math.max(...series.map(s => s.count), 1)
  const W = 100
  const H = 40
  const points = series.map((s, i) => {
    const x = (i / (series.length - 1)) * W
    const y = H - (s.count / max) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 56, overflow: 'visible' }} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="var(--blue-600)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={`0,${H} ${points} ${W},${H}`}
        fill="rgba(37,99,235,.08)"
        stroke="none"
      />
    </svg>
  )
}

function RecoveryDonut({ byStatus, T }: { byStatus: Record<string, number>; T: (k: string) => string }) {
  const improved  = byStatus.IMPROVED  ?? 0
  const unchanged = byStatus.UNCHANGED ?? 0
  const worse     = byStatus.WORSE     ?? 0
  const total     = improved + unchanged + worse
  if (total === 0) return       <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>{T('doctor.analytics.noRecovery')}</p>

  const slices: { value: number; color: string; label: string }[] = [
    { value: improved,  color: '#059669', label: T('doctor.analytics.improved')  },
    { value: unchanged, color: '#d97706', label: T('doctor.analytics.unchanged') },
    { value: worse,     color: '#dc2626', label: T('doctor.analytics.worse')     },
  ]

  // SVG donut — simple arc segments
  const r = 36, cx = 50, cy = 50, stroke = 14
  let cum = 0
  const circumference = 2 * Math.PI * r

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, flexShrink: 0 }}>
        {slices.map(sl => {
          const frac = sl.value / total
          const dashLen = frac * circumference
          const offset  = -cum * circumference
          cum += frac
          return (
            <circle
              key={sl.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={sl.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
            />
          )
        })}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 14, fontWeight: 700, fill: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map(sl => (
          <div key={sl.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: sl.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {sl.label} <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{sl.value}</span>
              <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>({Math.round((sl.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DoctorAnalyticsPage() {
  const { T } = useI18n()
  const [data, setData]   = useState<Analytics | null>(null)
  const [days, setDays]   = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/doctor/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 28,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-600)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {T('doctor.dash.title')}
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            {T('doctor.analytics.title')}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            {T('doctor.analytics.sub')}
          </p>
        </div>

        {/* Days selector */}
        <div style={{ position: 'relative' }}>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{
              appearance: 'none', padding: '8px 36px 8px 14px',
              borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-elev)', color: 'var(--ink)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {DAYS_OPTIONS.map(d => (
              <option key={d} value={d}>{T('doctor.analytics.lastDays').replace('{d}', String(d))}</option>
            ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
        </div>
      </header>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              height: 130, borderRadius: 18,
              background: 'linear-gradient(90deg, var(--bg-soft) 0%, var(--bg-elev) 50%, var(--bg-soft) 100%)',
              backgroundSize: '200% 100%',
              animation: 'mi-shimmer 1.4s linear infinite',
              border: '1px solid var(--border)',
            }} />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <StatCard
              icon={Users}
              label={T('doctor.analytics.consultCount').replace('{days}', String(days))}
              value={data.overview.inWindow}
              sub={`${data.overview.totalCompletedAllTime} completed all time`}
              tone="blue"
            />
            <StatCard
              icon={Activity}
              label={T('doctor.analytics.avgSeverity')}
              value={data.severity.avgScore || '—'}
              sub={T('doctor.analytics.scale')}
              tone="violet"
            />
            <StatCard
              icon={Heart}
              label={T('doctor.analytics.recovery')}
              value={data.recovery.improvedRate !== null ? `${Math.round(data.recovery.improvedRate * 100)}%` : '—'}
              sub={data.recovery.total > 0 ? `${data.recovery.total} outcomes recorded` : T('doctor.analytics.noOutcomes')}
              tone="emerald"
            />
            <StatCard
              icon={DollarSign}
              label={T('doctor.analytics.earnings').replace('{days}', String(days))}
              value={data.earnings.releasedInWindow > 0 ? `PKR ${data.earnings.releasedInWindow.toLocaleString()}` : '—'}
              sub={`${data.earnings.consultationsInWindow} paid consultations`}
              tone="amber"
            />
          </div>

          {/* Volume sparkline */}
          <section style={{
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TrendingUp size={15} style={{ color: 'var(--ink-3)' }} />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                {T('doctor.analytics.dailyVolume')}
              </h2>
            </div>
            <Sparkline series={data.volumeSeries} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{data.volumeSeries[0]?.date}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{data.volumeSeries[data.volumeSeries.length - 1]?.date}</span>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

            {/* Severity breakdown */}
            <section style={{
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={15} style={{ color: 'var(--ink-3)' }} />
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{T('doctor.analytics.severityBreakdown')}</h2>
              </div>
              {(['CRITICAL', 'URGENT', 'ROUTINE'] as const).map(lvl => {
                const count = data.severity.byLevel[lvl] ?? 0
                const total = Object.values(data.severity.byLevel).reduce((a, b) => a + b, 0)
                const color = lvl === 'CRITICAL' ? '#dc2626' : lvl === 'URGENT' ? '#d97706' : '#059669'
                return <BarRow key={lvl} label={lvl} count={count} max={total} color={color} />
              })}
            </section>

            {/* Recovery outcomes */}
            <section style={{
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Heart size={15} style={{ color: 'var(--ink-3)' }} />
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{T('doctor.analytics.recoveryOutcomes')}</h2>
              </div>
              <RecoveryDonut T={T} byStatus={data.recovery.byStatus} />
            </section>

            {/* Top departments */}
            <section style={{
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={15} style={{ color: 'var(--ink-3)' }} />
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{T('doctor.analytics.topDepts')}</h2>
              </div>
              {data.departments.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>{T('doctor.analytics.noData')}</p>
              ) : (
                data.departments.map(d => (
                  <BarRow
                    key={d.name}
                    label={d.name}
                    count={d.count}
                    max={data.departments[0].count}
                    color="var(--blue-600)"
                  />
                ))
              )}
            </section>
          </div>

          {/* Status breakdown */}
          <section style={{
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 20, boxShadow: 'var(--shadow-card)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={15} style={{ color: 'var(--ink-3)' }} />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                {T('doctor.analytics.outcomes').replace('{days}', String(days))}
              </h2>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-4)' }}>
                {T('doctor.analytics.completionPct').replace('{pct}', String(Math.round(data.overview.completionRate * 100)))}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              {(['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'CANCELLED', 'REFUNDED'] as const).map(s => {
                const count = data.overview.byStatus[s] ?? 0
                const colors: Record<string, string> = {
                  COMPLETED:   '#059669',
                  SCHEDULED:   'var(--blue-600)',
                  IN_PROGRESS: '#7c3aed',
                  CANCELLED:   'var(--ink-4)',
                  REFUNDED:    '#d97706',
                }
                return (
                  <div key={s} style={{
                    padding: '12px 16px', borderRadius: 12,
                    background: 'var(--bg-soft)', border: '1px solid var(--border)',
                  }}>
                    <p className="mono" style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors[s] }}>{count}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>
                      {s.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
