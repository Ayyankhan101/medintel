'use client'
import { useEffect, useState } from 'react'
import { AppointmentQueue } from '@/components/doctor/AppointmentQueue'
import { Users, CalendarDays, Clock3, CheckCircle2, TrendingUp } from 'lucide-react'

interface Stats { today: number; week: number; pending: number; completed: number }

type IconCmp = React.ComponentType<{ size?: number; strokeWidth?: number }>

const CARD_TONES = {
  blue:    { bg: 'rgba(37,99,235,.10)',  fg: 'var(--blue-700)' },
  violet:  { bg: 'rgba(139,92,246,.10)', fg: 'var(--violet-600)' },
  amber:   { bg: 'rgba(245,158,11,.12)', fg: '#a16207' },
  emerald: { bg: 'rgba(16,185,129,.12)', fg: '#047857' },
} as const

type Tone = keyof typeof CARD_TONES

export default function DoctorDashboardPage() {
  const [stats,  setStats]  = useState<Stats | null>(null)
  const [online, setOnline] = useState(false)
  const [busy,   setBusy]   = useState(false)

  useEffect(() => {
    fetch('/api/doctor/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  // Presence heartbeat: while `online`, ping every 60s so lastSeenAt stays
  // fresh. Patient-side query treats >3-min-stale as offline.
  useEffect(() => {
    if (!online) return
    const tick = () => fetch('/api/doctor/presence', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body:   JSON.stringify({ online: true }),
    }).catch(() => {})
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [online])

  // Tell the server we're offline when the doctor leaves the page.
  useEffect(() => {
    const off = () => {
      if (!online) return
      navigator.sendBeacon?.('/api/doctor/presence', new Blob(
        [JSON.stringify({ online: false })], { type: 'application/json' },
      ))
    }
    window.addEventListener('beforeunload', off)
    return () => { off(); window.removeEventListener('beforeunload', off) }
  }, [online])

  async function toggle() {
    setBusy(true)
    const next = !online
    try {
      const r = await fetch('/api/doctor/presence', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body:   JSON.stringify({ online: next }),
      })
      if (r.ok) setOnline(next)
    } finally { setBusy(false) }
  }

  const cards: { Icon: IconCmp; label: string; value: number; tone: Tone }[] = stats ? [
    { Icon: CalendarDays, label: 'Today',     value: stats.today,     tone: 'blue'    },
    { Icon: Users,        label: 'This week', value: stats.week,      tone: 'violet'  },
    { Icon: Clock3,       label: 'Pending',   value: stats.pending,   tone: 'amber'   },
    { Icon: CheckCircle2, label: 'Completed', value: stats.completed, tone: 'emerald' },
  ] : []

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 28,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-600)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Doctor console
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button" onClick={toggle} disabled={busy}
          aria-pressed={online}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 12px 6px 8px', borderRadius: 999,
            background: online ? 'rgba(16,185,129,.10)' : 'rgba(148,163,184,.10)',
            border: `1px solid ${online ? 'rgba(16,185,129,.30)' : 'rgba(148,163,184,.30)'}`,
            color: online ? '#047857' : 'var(--ink-3)',
            cursor: busy ? 'wait' : 'pointer',
          }}
          title={online ? 'You are visible to patients for Consult-Now' : 'Click to go online and accept instant consultations'}
        >
          <span style={{
            display: 'inline-block', width: 28, height: 16, borderRadius: 999,
            background: online ? 'var(--emerald-500)' : '#cbd5e1', position: 'relative',
            transition: 'background 160ms',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: online ? 14 : 2,
              width: 12, height: 12, borderRadius: 999, background: '#fff',
              transition: 'left 160ms',
            }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {online ? 'Available now' : 'Offline'}
          </span>
        </button>
      </header>

      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14,
        }}>
          {cards.map(c => {
            const t = CARD_TONES[c.tone]
            return (
              <div key={c.label} style={{
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 18,
                display: 'flex', flexDirection: 'column', gap: 12,
                boxShadow: 'var(--shadow-card)',
              }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: t.bg, color: t.fg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <c.Icon size={20} strokeWidth={2} />
                </span>
                <div>
                  <p className="mono" style={{ margin: 0, fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-.01em' }}>
                    {c.value}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{c.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{
          margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <TrendingUp size={16} style={{ color: 'var(--ink-3)' }} />
          Appointment queue
        </h2>
        <AppointmentQueue />
      </div>
    </div>
  )
}
