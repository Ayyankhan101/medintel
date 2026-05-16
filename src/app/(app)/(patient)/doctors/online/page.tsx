/**
 * Consult-Now — patient-facing list of doctors currently online.
 *
 * Pulls /api/doctors/online every 30s. Clicking "Consult Now" on a card
 * fires /api/appointments/instant, which books a SCHEDULED appointment at
 * NOW and returns its id. We then send the patient to /booking/[id] where
 * they pay (mock or SafePay).
 */
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Stethoscope, Star, Zap, AlertCircle } from 'lucide-react'

interface OnlineDoctor {
  id:               string
  name:             string | null
  specialization:   string
  yearsExperience:  number
  consultationFee:  string | number
  rating:           string | number | null
  reviewCount:      number
  trustBadge:       boolean
  lastSeenAt:       string | null
}

export default function DoctorsOnlinePage() {
  const router = useRouter()
  const [docs,    setDocs]    = useState<OnlineDoctor[] | null>(null)
  const [err,     setErr]     = useState<string | null>(null)
  const [booking, setBooking] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function refresh() {
      try {
        const r = await fetch('/api/doctors/online')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        if (alive) setDocs(data.doctors)
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  async function consultNow(doctorId: string) {
    setBooking(doctorId); setErr(null)
    try {
      const r = await fetch('/api/appointments/instant', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ doctorId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`)
      router.push(`/booking/${data.appointmentId}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to book')
      setBooking(null)
    }
  }

  return (
    <main style={{
      maxWidth: 880, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Consult Now
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Doctors available right now
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
          Pick a doctor, pay, and start a video call within minutes.
        </p>
      </header>

      {err && (
        <div style={{
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center',
          fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={16} /> {err}
        </div>
      )}

      {docs === null && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
        </div>
      )}

      {docs?.length === 0 && (
        <div style={{
          background: 'var(--bg-elev)', border: '1px dashed var(--border)',
          borderRadius: 16, padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14,
        }}>
          <Zap size={20} style={{ color: 'var(--ink-4)', marginBottom: 8 }} />
          <p style={{ margin: 0 }}>No doctors online right now. Try scheduling instead.</p>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {docs?.map(d => (
          <li key={d.id} style={{
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 16,
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center',
            boxShadow: 'var(--shadow-card)',
          }}>
            <span style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(16,185,129,.12)', color: '#047857',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <Stethoscope size={20} />
              <span style={{
                position: 'absolute', right: -2, bottom: -2,
                width: 12, height: 12, borderRadius: 999,
                background: 'var(--emerald-500)', border: '2px solid var(--bg-elev)',
              }} />
            </span>

            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>
                {d.name ?? 'Doctor'}
                {d.trustBadge && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#047857',
                    background: 'rgba(16,185,129,.12)', padding: '2px 6px', borderRadius: 6,
                  }}>Verified</span>
                )}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                {d.specialization} · {d.yearsExperience}y exp
                {d.rating && (
                  <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Star size={11} fill="currentColor" style={{ color: '#f59e0b' }} />
                    {Number(d.rating).toFixed(1)} ({d.reviewCount})
                  </span>
                )}
              </p>
              <p className="mono" style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
                Rs. {Number(d.consultationFee).toLocaleString('en-PK')}
              </p>
            </div>

            <button
              type="button" onClick={() => consultNow(d.id)} disabled={booking !== null}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '0 16px', height: 40, borderRadius: 12,
                background: 'var(--blue-600)', color: '#fff', border: 0,
                fontSize: 13, fontWeight: 600,
                cursor: booking ? 'wait' : 'pointer',
                opacity: booking && booking !== d.id ? 0.5 : 1,
              }}
            >
              {booking === d.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {booking === d.id ? 'Booking…' : 'Consult Now'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
