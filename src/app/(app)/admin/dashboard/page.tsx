'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Stethoscope, Calendar, Banknote, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react'

interface Stats {
  patients: number
  doctors: { pending: number; verified: number; rejected: number; total: number }
  appointments: { total: number; completed: number; cancelled: number }
  escrow: { held: number; released: number }
}

type IconCmp = React.ComponentType<{ size?: number; strokeWidth?: number }>

const TONES = {
  blue:    { bg: 'rgba(37,99,235,.10)',  fg: 'var(--blue-700)' },
  emerald: { bg: 'rgba(16,185,129,.12)', fg: '#047857' },
  amber:   { bg: 'rgba(245,158,11,.12)', fg: '#a16207' },
  violet:  { bg: 'rgba(139,92,246,.10)', fg: 'var(--violet-600)' },
} as const

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
        return r.json()
      })
      .then(setStats)
      .catch(e => setErr(e.message))
  }, [])

  if (err) return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 16px' }}>
      <div style={{
        background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
        borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
      }}>{err}</div>
    </div>
  )
  if (!stats) return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '60px 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /> Loading…
    </div>
  )

  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Admin
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Overview
        </h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Stat Icon={Users}       tone="blue"    label="Patients"         value={stats.patients} />
        <Stat Icon={Stethoscope} tone="emerald" label="Verified doctors" value={stats.doctors.verified} />
        <Stat Icon={Calendar}    tone="amber"   label="Appointments"     value={stats.appointments.total} />
        <Stat Icon={Banknote}    tone="violet"  label="Escrow held"      value={stats.escrow.held} />
      </div>

      <Link href="/admin/doctors?status=PENDING"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, borderRadius: 18,
          background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.25)',
          textDecoration: 'none', color: 'var(--ink)',
          transition: 'background-color 200ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(245,158,11,.18)', color: '#a16207',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldAlert size={20} />
          </span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)' }}>
              {stats.doctors.pending} doctors waiting for verification
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
              Review credentials and approve or reject.
            </p>
          </div>
        </div>
        <ArrowRight size={16} style={{ color: 'var(--ink-4)' }} />
      </Link>

      <Section title="Doctors">
        <Breakdown label="Pending"  value={stats.doctors.pending}  color="#a16207" />
        <Breakdown label="Verified" value={stats.doctors.verified} color="#047857" />
        <Breakdown label="Rejected" value={stats.doctors.rejected} color="var(--red-600)" />
      </Section>

      <Section title="Appointments">
        <Breakdown label="Total"     value={stats.appointments.total}     color="var(--ink)" />
        <Breakdown label="Completed" value={stats.appointments.completed} color="#047857" />
        <Breakdown label="Cancelled" value={stats.appointments.cancelled} color="var(--red-600)" />
      </Section>
    </div>
  )
}

function Stat({ Icon, tone, label, value }: { Icon: IconCmp; tone: keyof typeof TONES; label: string; value: number }) {
  const t = TONES[tone]
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 10,
          background: t.bg, color: t.fg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</span>
      </div>
      <p className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-.01em' }}>
        {value.toLocaleString('en-PK')}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 18, padding: 18, boxShadow: 'var(--shadow-card)',
    }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>{title}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {children}
      </div>
    </section>
  )
}

function Breakdown({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)' }}>{label}</p>
      <p className="mono" style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color }}>{value}</p>
    </div>
  )
}
