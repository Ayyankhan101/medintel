'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/client'

interface Metrics {
  windowDays: number
  asOf: string
  users: { total: number; newInWindow: number; patients: number; doctors: number; doctorsVerified: number; doctorsOnlineNow: number }
  appointments: { total: number; byStatusInWindow: Record<string, number>; completionRate: number; noShowRate: number }
  revenue: { grossInWindow: number; escrowsInWindow: number; refundedInWindow: number; refundRate: number; avgConsultationFee: number; currency: string }
  triage:  { total: number; inWindow: number; avgSeverityScore: number; criticalInWindow: number }
  quality: { reviews: number; avgRating: number }
}

export default function AdminMetricsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Metrics | null>(null)
  const [err, setErr]   = useState<string | null>(null)
  const { T } = useI18n()

  useEffect(() => {
    setData(null); setErr(null)
    fetch(`/api/admin/metrics?days=${days}`).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
    }).catch(e => setErr(e.message))
  }, [days])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px clamp(16px, 4vw, 32px) 64px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <span style={{ fontSize: 'var(--text-xxs)', fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {T('admin.title')}
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 'var(--text-heading)', fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            {T('admin.metrics.title')}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
            {data ? T('admin.metrics.asOf').replace('{date}', new Date(data.asOf).toLocaleString('en-PK')) : T('common.loading')}
          </p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--ink)', fontSize: 'var(--text-base)', outline: 'none' }}>
          <option value={7}>{T('doctor.analytics.lastDays').replace('{d}', '7')}</option>
          <option value={30}>{T('doctor.analytics.lastDays').replace('{d}', '30')}</option>
          <option value={90}>{T('doctor.analytics.lastDays').replace('{d}', '90')}</option>
          <option value={365}>{T('doctor.analytics.lastDays').replace('{d}', '365')}</option>
        </select>
      </header>

      {err && <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', padding: 12, borderRadius: 10, color: 'var(--red-600)', fontSize: 'var(--text-base)' }}>Failed to load: {err}</div>}
      {!data && !err && <div style={{ color: 'var(--ink-3)', fontSize: 'var(--text-base)' }}>Loading…</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Section title={T('admin.metrics.users')}>
            <Stat label={T('admin.metrics.totalUsers')}        value={data.users.total} />
            <Stat label={T('admin.metrics.newInDays').replace('{days}', String(days))}  value={data.users.newInWindow} />
            <Stat label={T('admin.patients')}           value={data.users.patients} />
            <Stat label={T('admin.verifiedDoctors')}   value={`${data.users.doctorsVerified} / ${data.users.doctors}`} />
            <Stat label={T('admin.metrics.doctorsOnline')} value={data.users.doctorsOnlineNow} highlight={data.users.doctorsOnlineNow > 0} />
          </Section>

          <Section title={T('admin.appointments')}>
            <Stat label={T('admin.metrics.allTime')}           value={data.appointments.total} />
            <Stat label={T('admin.metrics.completionRate')}    value={pct(data.appointments.completionRate)} />
            <Stat label={T('admin.metrics.noShowCancel')}   value={pct(data.appointments.noShowRate)} bad />
            {Object.entries(data.appointments.byStatusInWindow).map(([k, v]) => (
              <Stat key={k} label={k.toLowerCase().replace('_', ' ')} value={v} />
            ))}
          </Section>

          <Section title={T('admin.metrics.revenue')}>
            <Stat label={T('admin.metrics.grossDays').replace('{days}', String(days))} value={`${data.revenue.currency} ${data.revenue.grossInWindow.toLocaleString('en-PK')}`} />
            <Stat label="Escrows opened"     value={data.revenue.escrowsInWindow} />
            <Stat label="Refunded"           value={data.revenue.refundedInWindow} />
            <Stat label="Refund rate"        value={pct(data.revenue.refundRate)} bad={data.revenue.refundRate > 0.1} />
            <Stat label="Avg consult fee"    value={`${data.revenue.currency} ${data.revenue.avgConsultationFee.toLocaleString('en-PK')}`} />
          </Section>

          <Section title={T('admin.metrics.triage')}>
            <Stat label={T('admin.metrics.allTime')}           value={data.triage.total} />
            <Stat label={`In ${days}d`}      value={data.triage.inWindow} />
            <Stat label="Avg severity"       value={data.triage.avgSeverityScore} />
            <Stat label="Critical flagged"   value={data.triage.criticalInWindow} bad={data.triage.criticalInWindow > 0} />
          </Section>

          <Section title={T('admin.metrics.quality')}>
            <Stat label="Reviews"            value={data.quality.reviews} />
            <Stat label="Avg rating"         value={`${data.quality.avgRating} / 5`} />
          </Section>
        </div>
      )}
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass" style={{ borderRadius: 14, padding: 16 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: 'var(--text-xxs)', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</h2>
      <div style={{ display: 'grid', gap: 8 }}>{children}</div>
    </section>
  )
}

function Stat({ label, value, highlight, bad }: { label: string; value: number | string; highlight?: boolean; bad?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-3)' }}>{label}</span>
      <span style={{
        fontSize: 'var(--text-lg)', fontWeight: 700,
        color: bad ? '#dc2626' : highlight ? '#16a34a' : 'var(--ink)',
      }}>{value}</span>
    </div>
  )
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}
