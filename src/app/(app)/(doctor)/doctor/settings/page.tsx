'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, CreditCard, Loader2, ExternalLink, Clock } from 'lucide-react'
import { DEFAULT_AVAILABILITY, type Availability } from '@/lib/availability'
import { Btn } from '@/components/design/Btn'

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function SettingsContent() {
  const params  = useSearchParams()
  const success = params.get('onboard') === 'success'

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [av,       setAv]       = useState<Availability>(DEFAULT_AVAILABILITY)
  const [avSaving, setAvSaving] = useState(false)
  const [avSaved,  setAvSaved]  = useState(false)
  const [avErr,    setAvErr]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/doctor/availability')
      .then(r => r.json())
      .then(d => { if (d.availability) setAv(d.availability) })
      .catch(() => {})
  }, [])

  function toggleDay(d: number) {
    setAv(a => ({ ...a, days: a.days.includes(d) ? a.days.filter(x => x !== d) : [...a.days, d].sort() }))
  }

  async function saveAvailability() {
    setAvSaving(true); setAvErr(null); setAvSaved(false)
    try {
      const res = await fetch('/api/doctor/availability', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(av),
      })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? (await res.json()).error ?? `HTTP ${res.status}`)
      setAvSaved(true)
      setTimeout(() => setAvSaved(false), 2000)
    } catch (e) {
      setAvErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setAvSaving(false)
    }
  }

  async function startOnboarding() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/stripe/onboard', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start onboarding')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding')
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: 760, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-600)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Doctor console
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
          Manage your account and payment details.
        </p>
      </header>

      {success && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(16,185,129,.10)', border: '1px solid rgba(16,185,129,.30)',
          borderRadius: 14, padding: 14,
        }}>
          <CheckCircle2 size={18} style={{ color: 'var(--emerald-500)', flex: 'none', marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#047857' }}>Stripe onboarding complete!</p>
            <p style={{ margin: '2px 0 0' }}>You can now receive consultation payments directly to your bank account.</p>
          </div>
        </div>
      )}

      <Section icon={<CreditCard size={18} />} title="Payment setup">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Connect your Stripe account to receive payments from consultations.
          Funds are held in escrow and released automatically once you upload a prescription.
        </p>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
          }}>{error}</div>
        )}
        <Btn kind="primary" onClick={startOnboarding} disabled={loading}
             leading={loading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}>
          {loading ? 'Redirecting…' : success ? 'Update Stripe account' : 'Connect with Stripe'}
        </Btn>
      </Section>

      <Section icon={<Clock size={18} />} title="Working hours">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Patients can only book inside this window (Asia/Karachi time). Leave blank to be always available.
        </p>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            Days
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[1,2,3,4,5,6,7].map(d => {
              const active = av.days.includes(d)
              return (
                <button key={d} onClick={() => toggleDay(d)} className="focus-ring"
                  style={{
                    padding: '8px 14px', borderRadius: 10,
                    border: '1px solid ' + (active ? 'var(--blue-600)' : 'var(--border)'),
                    background: active ? 'var(--blue-600)' : 'var(--bg-elev)',
                    color: active ? '#fff' : 'var(--ink-2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 200ms var(--ease-out-quart)',
                  }}>
                  {DAY_LABELS[d]}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Start hour</span>
            <input
              type="number" min={0} max={23} value={av.startHour}
              onChange={e => setAv(a => ({ ...a, startHour: Math.max(0, Math.min(23, parseInt(e.target.value || '0', 10))) }))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>End hour</span>
            <input
              type="number" min={1} max={24} value={av.endHour}
              onChange={e => setAv(a => ({ ...a, endHour: Math.max(1, Math.min(24, parseInt(e.target.value || '1', 10))) }))}
              style={inputStyle}
            />
          </label>
        </div>

        {avErr   && <p style={{ margin: 0, fontSize: 12, color: 'var(--red-600)' }}>{avErr}</p>}
        {avSaved && <p style={{ margin: 0, fontSize: 12, color: '#047857' }}>Saved.</p>}

        <Btn kind="primary" onClick={saveAvailability} disabled={avSaving}
             leading={avSaving ? <Loader2 size={14} className="animate-spin" /> : null}>
          {avSaving ? 'Saving…' : 'Save availability'}
        </Btn>
      </Section>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 22, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--ink-3)' }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg-elev)', color: 'var(--ink)',
  fontSize: 14, outline: 'none', fontFamily: 'var(--font-ui)',
}

export default function DoctorSettingsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <SettingsContent />
    </Suspense>
  )
}
