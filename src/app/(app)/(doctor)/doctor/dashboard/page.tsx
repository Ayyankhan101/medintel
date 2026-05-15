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
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    fetch('/api/doctor/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

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
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(16,185,129,.10)', border: '1px solid rgba(16,185,129,.30)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--emerald-500)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#047857' }}>Online</span>
        </div>
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
