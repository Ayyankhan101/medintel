'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, X, Loader2, ShieldCheck } from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { KYDBadge } from '@/components/design/badges'
import { PKR } from '@/components/design/helpers'

interface Doctor {
  id: string
  licenseNumber: string
  specialization: string
  qualifications: string | null
  yearsExperience: number
  consultationFee: string | number
  bio: string | null
  kydStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  trustBadge: boolean
  stripeAccountId: string | null
  user: { id: string; name: string | null; email: string; phone: string | null; createdAt: string }
  _count: { appointments: number }
}

type Filter = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'

export default function AdminDoctorsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    }>
      <AdminDoctorsInner />
    </Suspense>
  )
}

function AdminDoctorsInner() {
  const search = useSearchParams()
  const initial = (search.get('status') ?? 'PENDING') as Filter
  const [filter, setFilter] = useState<Filter>(initial)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const qs = filter === 'ALL' ? '' : `?status=${filter}`
    fetch(`/api/admin/doctors${qs}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { setDoctors(d.doctors); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  async function decide(id: string, approve: boolean) {
    const reason = approve ? '' : prompt('Reason for rejection:')
    if (!approve && !reason) return
    const trustBadge = approve ? confirm('Award trust badge (Tier 3)?') : false
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/doctors/${id}/verify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(approve ? { decision: 'approve', trustBadge } : { decision: 'reject', reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? `HTTP ${res.status}`)
        return
      }
      load()
    } finally { setBusyId(null) }
  }

  return (
    <div style={{
      maxWidth: 1180, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Admin
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Doctor verification
          </h1>
        </div>
        <div style={{
          display: 'inline-flex', gap: 2, padding: 4,
          background: 'var(--bg-soft)', border: '1px solid var(--border)',
          borderRadius: 12,
        }}>
          {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as Filter[]).map(f => {
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)} className="focus-ring"
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 0,
                  background: active ? 'var(--bg-elev)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: active ? '0 1px 0 rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)' : 'none',
                  fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
                  cursor: 'pointer',
                  transition: 'all 200ms var(--ease-out-quart)',
                }}>
                {f}
              </button>
            )
          })}
        </div>
      </header>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
        }}>{error}</div>
      )}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}>
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {!loading && doctors.length === 0 && (
        <div style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 40, textAlign: 'center',
          color: 'var(--ink-3)', fontSize: 13,
        }}>
          No doctors in this state.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {doctors.map(d => (
          <div key={d.id} style={{
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 18, boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>Dr. {d.user.name ?? '—'}</p>
                  {d.trustBadge && (
                    <span title="Trust badge" style={{ color: 'var(--amber-500)' }}>
                      <ShieldCheck size={16} strokeWidth={2.5} />
                    </span>
                  )}
                  <KYDBadge status={d.kydStatus} />
                </div>
                <p style={{ margin: '4px 0 12px', fontSize: 11, color: 'var(--ink-3)' }}>
                  {d.user.email}{d.user.phone ? ` · ${d.user.phone}` : ''}
                </p>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '4px 16px',
                }}>
                  <Field label="PMDC"           value={d.licenseNumber} mono />
                  <Field label="Specialty"      value={d.specialization} />
                  <Field label="Experience"     value={`${d.yearsExperience} yrs`} />
                  <Field label="Fee"            value={PKR(Number(d.consultationFee))} mono />
                  <Field label="Qualifications" value={d.qualifications ?? '—'} />
                  <Field label="Bookings"       value={String(d._count.appointments)} />
                  <Field label="Stripe"         value={d.stripeAccountId ? 'connected' : 'not connected'} />
                  <Field label="Joined"         value={new Date(d.user.createdAt).toLocaleDateString('en-PK')} />
                </div>
                {d.bio && <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{d.bio}</p>}
              </div>
              {d.kydStatus === 'PENDING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 'none' }}>
                  <Btn kind="primary"
                       disabled={busyId === d.id}
                       onClick={() => decide(d.id, true)}
                       style={{ background: 'var(--emerald-500)', boxShadow: '0 4px 12px -4px rgba(16,185,129,.55)' }}
                       leading={busyId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}>
                    Approve
                  </Btn>
                  <Btn kind="primary"
                       disabled={busyId === d.id}
                       onClick={() => decide(d.id, false)}
                       style={{ background: 'var(--red-600)', boxShadow: '0 4px 12px -4px rgba(239,68,68,.55)' }}
                       leading={<X size={14} />}>
                    Reject
                  </Btn>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{
        margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--ink-4)',
        letterSpacing: '.06em', textTransform: 'uppercase',
      }}>{label}</p>
      <p className={mono ? 'mono' : ''} style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>{value}</p>
    </div>
  )
}
