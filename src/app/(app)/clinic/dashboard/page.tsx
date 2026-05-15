'use client'
import { useEffect, useState } from 'react'
import {
  Building2, MessageSquareText, PhoneCall, Stethoscope, Globe,
  Loader2, CreditCard, Sparkles, UserPlus, X, Mail, Clock, BarChart3, Download,
} from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { ClinicPlanPill } from '@/components/design/badges'
import { PKR } from '@/components/design/helpers'

interface ClinicData {
  clinic: {
    id:             string
    name:           string
    slug:           string
    plan:           'STARTER' | 'STANDARD' | 'ENTERPRISE'
    minutesQuota:   number
    minutesUsed:    number
    whatsappNumber: string | null
    voiceNumber:    string | null
    active:         boolean
    stripeCustomerId:     string | null
    stripeSubscriptionId: string | null
    currentPeriodEnd:     string | null
    _count:         { doctors: number; members: number }
  }
  usage30d: { channel: string; minutes: number }[]
}

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquareText size={14} />,
  voice:    <PhoneCall size={14} />,
  scribe:   <Stethoscope size={14} />,
  web:      <Globe size={14} />,
}

const CLINIC_KICKER = { color: '#0d9488' }

export default function ClinicDashboard() {
  const [data,    setData]    = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clinic/me')
      .then(async r => r.ok ? r.json() : Promise.reject((await r.json()).error ?? 'Load failed'))
      .then(setData)
      .catch(e => setErr(typeof e === 'string' ? e : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Wrap><Loader2 size={20} className="animate-spin" style={{ color: 'var(--ink-4)' }} /></Wrap>
  if (err || !data) return <Wrap><p style={{ fontSize: 13, color: 'var(--red-600)' }}>{err ?? 'No clinic linked.'}</p></Wrap>

  const { clinic, usage30d } = data
  const pct = Math.min(100, Math.round((clinic.minutesUsed / clinic.minutesQuota) * 100))
  const quotaColor = pct > 90 ? 'var(--red-500)' : pct > 70 ? 'var(--amber-500)' : 'var(--blue-600)'

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(13,148,136,.10)', color: CLINIC_KICKER.color,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={22} />
        </span>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: CLINIC_KICKER.color, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Clinic console
          </span>
          <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            {clinic.name}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ClinicPlanPill plan={clinic.plan} /> · {clinic._count.doctors} doctor(s)
          </p>
        </div>
      </header>

      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={cardTitle}>Minutes this month</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
            <strong style={{ color: 'var(--ink)' }}>{clinic.minutesUsed.toLocaleString()}</strong>{' '}/{' '}
            {clinic.minutesQuota.toLocaleString()}
          </p>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-soft)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: quotaColor, transition: 'width 320ms var(--ease-out-quart)' }} />
        </div>
        {pct >= 90 && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--red-600)' }}>
            Approaching your monthly quota — upgrade your plan to avoid interruption.
          </p>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {['whatsapp', 'voice', 'scribe', 'web'].map(ch => {
          const row = usage30d.find(u => u.channel === ch)
          return (
            <div key={ch} style={{
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {CHANNEL_ICON[ch]} {ch}
              </div>
              <p className="mono" style={{ margin: '10px 0 0', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
                {(row?.minutes ?? 0).toLocaleString()}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>minutes / 30 days</p>
            </div>
          )
        })}
      </div>

      <BillingCard
        plan={clinic.plan}
        hasSubscription={!!clinic.stripeSubscriptionId}
        periodEnd={clinic.currentPeriodEnd}
      />

      <RosterCard />

      <DoctorBreakdownCard />

      <Card>
        <h2 style={cardTitle}>Channels</h2>
        <Row label="WhatsApp number" value={clinic.whatsappNumber} />
        <Row label="Voice number"    value={clinic.voiceNumber} />
        <Row label="Public slug"     value={`/c/${clinic.slug}`} />
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-4)' }}>
          <a href="/clinic/settings" style={{ color: 'var(--ink-2)', fontWeight: 600, textDecoration: 'underline' }}>
            Edit brand &amp; channels →
          </a>
        </p>
      </Card>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 22, boxShadow: 'var(--shadow-card)',
    }}>{children}</div>
  )
}

const cardTitle: React.CSSProperties = {
  margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)',
  display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12,
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 16px' }}>{children}</div>
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
      <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{value ?? '—'}</span>
    </div>
  )
}

/* ── billing ── */
function BillingCard({ plan, hasSubscription, periodEnd }: {
  plan: 'STARTER' | 'STANDARD' | 'ENTERPRISE'
  hasSubscription: boolean
  periodEnd: string | null
}) {
  const [busy, setBusy] = useState<'STARTER' | 'STANDARD' | 'portal' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  async function checkout(target: 'STARTER' | 'STANDARD') {
    setBusy(target); setErr(null)
    const r = await fetch('/api/clinic/billing/checkout', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ plan: target }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.url) { window.location.href = d.url; return }
    setBusy(null); setErr(d.error ?? 'Checkout failed')
  }

  async function portal() {
    setBusy('portal'); setErr(null)
    const r = await fetch('/api/clinic/billing/portal', { method: 'POST' })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.url) { window.location.href = d.url; return }
    setBusy(null); setErr(d.error ?? 'Portal failed')
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={cardTitle}><CreditCard size={14} /> Billing</h2>
        <ClinicPlanPill plan={plan} />
      </div>

      {periodEnd && (
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-3)' }}>
          Current period ends {new Date(periodEnd).toLocaleDateString('en-PK', { dateStyle: 'medium' })}.
        </p>
      )}

      {err && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--red-600)' }}>{err}</p>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {hasSubscription ? (
          <Btn kind="primary" onClick={portal} disabled={busy !== null}
               leading={busy === 'portal' ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}>
            Manage billing
          </Btn>
        ) : (
          <>
            <Btn kind="secondary" onClick={() => checkout('STARTER')} disabled={busy !== null}
                 leading={busy === 'STARTER' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}>
              Activate Starter
            </Btn>
            <Btn kind="primary" onClick={() => checkout('STANDARD')} disabled={busy !== null}
                 leading={busy === 'STANDARD' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}>
              Upgrade to Standard
            </Btn>
          </>
        )}
        <a href="mailto:partners@medintel.app?subject=Enterprise%20plan%20-%20MedIntel"
           style={{
             display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
             padding: '0 14px', height: 'var(--h-tap, 48px)', borderRadius: 14,
             background: 'transparent', color: 'var(--ink-2)',
             border: '1px solid var(--border)',
             fontSize: 14, fontWeight: 600, textDecoration: 'none',
           }}>
          Talk to sales (Enterprise)
        </a>
      </div>
    </Card>
  )
}

/* ── roster ── */
interface Doctor { id: string; specialization: string; consultationFee: string | number; user: { name: string | null; email: string } }
interface Invite { id: string; email: string; expiresAt: string; createdAt: string }

function RosterCard() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [email,   setEmail]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/clinic/doctors')
    if (r.ok) {
      const d = await r.json()
      setDoctors(d.doctors ?? [])
      setInvites(d.invites ?? [])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setBusy(true); setErr(null)
    const r = await fetch('/api/clinic/doctors/invite', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(typeof d.error === 'string' ? d.error : 'Invite failed'); return }
    setEmail(''); load()
  }

  async function revoke(id: string) {
    await fetch(`/api/clinic/doctors/invite?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={cardTitle}><Stethoscope size={14} /> Doctors</h2>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
          {doctors.length} active · {invites.length} pending
        </span>
      </div>

      <form onSubmit={invite} style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="email" required placeholder="doctor@clinic.pk"
               value={email} onChange={e => setEmail(e.target.value)}
               style={{
                 flex: 1, minWidth: 200, padding: '10px 14px',
                 borderRadius: 10, border: '1px solid var(--border)',
                 background: 'var(--bg-elev)', color: 'var(--ink)',
                 fontSize: 13, outline: 'none',
               }} />
        <Btn kind="primary" type="submit" disabled={busy}
             leading={busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}>
          Invite
        </Btn>
      </form>

      {err && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--red-600)' }}>{err}</p>}
      {loading && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>
          <Loader2 size={12} className="animate-spin" style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />
          Loading roster…
        </p>
      )}

      {!loading && doctors.length === 0 && invites.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>No doctors yet. Invite your first one above.</p>
      )}

      {doctors.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {doctors.map(d => (
            <li key={d.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{d.user.name ?? d.user.email}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
                  {d.specialization} · {PKR(Number(d.consultationFee))}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#047857', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                Active
              </span>
            </li>
          ))}
        </ul>
      )}

      {invites.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Pending invites
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invites.map(i => (
              <li key={i.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)', minWidth: 0 }}>
                  <Mail size={13} style={{ flex: 'none' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.email}</span>
                  <span style={{ fontSize: 10, color: 'var(--ink-4)', display: 'inline-flex', alignItems: 'center', gap: 2, flex: 'none' }}>
                    <Clock size={10} /> expires {new Date(i.expiresAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                  </span>
                </div>
                <button onClick={() => revoke(i.id)} title="Revoke"
                  style={{
                    background: 'transparent', border: 0, padding: 4,
                    color: 'var(--ink-4)', cursor: 'pointer',
                    borderRadius: 6,
                  }}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/* ── breakdown ── */
interface BreakdownRow {
  doctorId:       string
  name:           string
  email:          string
  specialization: string
  rating:         number | null
  reviewCount:    number
  completed:      number
  cancelled:      number
  refunded:       number
  noShow:         number
  revenuePkr:     number
}

function DoctorBreakdownCard() {
  const [rows, setRows]       = useState<BreakdownRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clinic/usage/breakdown')
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => setRows(d.rows ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={cardTitle}>
          <BarChart3 size={14} /> Per-doctor breakdown
          <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>(last 30 days)</span>
        </h2>
        <a href="/api/clinic/usage/export.csv"
           style={{
             display: 'inline-flex', alignItems: 'center', gap: 4,
             fontSize: 12, fontWeight: 600, color: 'var(--blue-700)', textDecoration: 'none',
           }}>
          <Download size={12} /> CSV
        </a>
      </div>
      {loading ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-4)' }}>
          <Loader2 size={12} className="animate-spin" style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Loading…
        </p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>No doctors in this clinic yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Doctor', 'Done', 'Cancel', 'Refund', 'No-show', 'Rating', 'Revenue (PKR)'].map((h, i) => (
                  <th key={h} style={{
                    padding: '8px 12px 8px 0', textAlign: i === 0 ? 'left' : 'right',
                    fontSize: 10, fontWeight: 700, color: 'var(--ink-3)',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.doctorId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px 10px 0' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>{r.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>{r.specialization}</p>
                  </td>
                  <td className="mono" style={{ padding: '10px 12px 10px 0', textAlign: 'right' }}>{r.completed}</td>
                  <td className="mono" style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: 'var(--ink-3)' }}>{r.cancelled}</td>
                  <td className="mono" style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: '#a16207' }}>{r.refunded}</td>
                  <td className="mono" style={{ padding: '10px 12px 10px 0', textAlign: 'right', color: 'var(--red-600)' }}>{r.noShow}</td>
                  <td className="mono" style={{ padding: '10px 12px 10px 0', textAlign: 'right' }}>
                    {r.rating ? r.rating.toFixed(1) : '—'} <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>({r.reviewCount})</span>
                  </td>
                  <td className="mono" style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700 }}>
                    {r.revenuePkr.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
