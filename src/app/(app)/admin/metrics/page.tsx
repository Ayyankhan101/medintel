'use client'
import { useEffect, useState } from 'react'

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

  useEffect(() => {
    setData(null); setErr(null)
    fetch(`/api/admin/metrics?days=${days}`).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
    }).catch(e => setErr(e.message))
  }, [days])

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px clamp(16px, 4vw, 32px) 64px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Admin
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Metrics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            {data ? `As of ${new Date(data.asOf).toLocaleString('en-PK')}` : 'Loading…'}
          </p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--ink)', fontSize: 14, outline: 'none' }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </header>

      {err && <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', padding: 12, borderRadius: 10, color: 'var(--red-600)', fontSize: 14 }}>Failed to load: {err}</div>}
      {!data && !err && <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Section title="Users">
            <Stat label="Total users"        value={data.users.total} />
            <Stat label={`New in ${days}d`}  value={data.users.newInWindow} />
            <Stat label="Patients"           value={data.users.patients} />
            <Stat label="Doctors verified"   value={`${data.users.doctorsVerified} / ${data.users.doctors}`} />
            <Stat label="Doctors online now" value={data.users.doctorsOnlineNow} highlight={data.users.doctorsOnlineNow > 0} />
          </Section>

          <Section title="Appointments">
            <Stat label="All-time"           value={data.appointments.total} />
            <Stat label="Completion rate"    value={pct(data.appointments.completionRate)} />
            <Stat label="No-show / cancel"   value={pct(data.appointments.noShowRate)} bad />
            {Object.entries(data.appointments.byStatusInWindow).map(([k, v]) => (
              <Stat key={k} label={k.toLowerCase().replace('_', ' ')} value={v} />
            ))}
          </Section>

          <Section title="Revenue">
            <Stat label={`Gross / ${days}d`} value={`${data.revenue.currency} ${data.revenue.grossInWindow.toLocaleString('en-PK')}`} />
            <Stat label="Escrows opened"     value={data.revenue.escrowsInWindow} />
            <Stat label="Refunded"           value={data.revenue.refundedInWindow} />
            <Stat label="Refund rate"        value={pct(data.revenue.refundRate)} bad={data.revenue.refundRate > 0.1} />
            <Stat label="Avg consult fee"    value={`${data.revenue.currency} ${data.revenue.avgConsultationFee.toLocaleString('en-PK')}`} />
          </Section>

          <Section title="Triage">
            <Stat label="All-time"           value={data.triage.total} />
            <Stat label={`In ${days}d`}      value={data.triage.inWindow} />
            <Stat label="Avg severity"       value={data.triage.avgSeverityScore} />
            <Stat label="Critical flagged"   value={data.triage.criticalInWindow} bad={data.triage.criticalInWindow > 0} />
          </Section>

          <Section title="Quality">
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
      <h2 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</h2>
      <div style={{ display: 'grid', gap: 8 }}>{children}</div>
    </section>
  )
}

function Stat({ label, value, highlight, bad }: { label: string; value: number | string; highlight?: boolean; bad?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
      <span style={{
        fontSize: 16, fontWeight: 700,
        color: bad ? '#dc2626' : highlight ? '#16a34a' : 'var(--ink)',
      }}>{value}</span>
    </div>
  )
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}
