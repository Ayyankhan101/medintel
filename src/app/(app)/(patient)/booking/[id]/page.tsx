'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Calendar, Video, Loader2, Stethoscope, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { PKR } from '@/components/design/helpers'

interface Appointment {
  id:          string
  scheduledAt: string
  status:      string
  doctor: {
    id:              string
    specialization:  string
    consultationFee: string | number
    user: { name: string | null; email: string }
  } | null
  escrow: { amount: string | number; status: string } | null
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [appt, setAppt] = useState<Appointment | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/appointments/${id}`)
      .then(async r => r.ok ? r.json() : Promise.reject((await r.json()).error))
      .then(setAppt)
      .catch(e => setErr(typeof e === 'string' ? e : 'Failed to load'))
  }, [id])

  if (err) return <Centered><p style={{ margin: 0, fontSize: 13, color: 'var(--red-600)' }}>{err}</p></Centered>
  if (!appt) return <Centered><Loader2 size={28} className="animate-spin" style={{ color: 'var(--ink-4)' }} /></Centered>

  const when = new Date(appt.scheduledAt)
  const fmt  = new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }).format(when)
  const fee  = appt.escrow?.amount ?? appt.doctor?.consultationFee

  return (
    <div style={{
      maxWidth: 600, margin: '0 auto',
      padding: '32px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <span style={{
          width: 64, height: 64, borderRadius: 999,
          background: 'rgba(16,185,129,.12)', color: 'var(--emerald-500)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          animation: 'mi-fade-up 360ms var(--ease-out-quart) both',
        }}>
          <CheckCircle2 size={32} strokeWidth={2.5} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            You&apos;re booked
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            A confirmation email is on the way. Save the calendar invite so you don&apos;t miss it.
          </p>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 22, boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {appt.doctor && (
          <Row icon={<Stethoscope size={16} />} label="Doctor">
            <Link href={`/doctors/${appt.doctor.id}`}
                  style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
              {appt.doctor.user.name ?? 'Doctor'}
            </Link>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)' }}>{appt.doctor.specialization}</span>
          </Row>
        )}
        <Row icon={<Calendar size={16} />} label="When">
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmt}</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)' }}>Asia/Karachi · ~30 min</span>
        </Row>
        {fee !== undefined && (
          <Row icon={<ShieldCheck size={16} />} label="Payment">
            <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{PKR(Number(fee))}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)' }}>
              Held in escrow until the doctor uploads your prescription.
            </span>
          </Row>
        )}
        <Row icon={<span className="mono" style={{ fontSize: 10 }}>ID</span>} label="Reference" noBorder>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{appt.id}</span>
        </Row>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <Link
          href={`/consultation/${appt.id}`}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '0 18px', height: 48, borderRadius: 14,
            background: 'var(--blue-600)', color: '#fff',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 8px 20px -8px rgba(37,99,235,.55)',
          }}
        >
          <Video size={16} /> Join consultation
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
        <a
          href={`/api/appointments/${appt.id}/ics`}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '0 18px', height: 48, borderRadius: 14,
            background: 'var(--bg-elev)', color: 'var(--ink)',
            border: '1px solid var(--border)',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}
        >
          <Calendar size={16} /> Add to calendar
        </a>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/history" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
          View all appointments →
        </Link>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px', display: 'flex', justifyContent: 'center' }}>
      {children}
    </div>
  )
}

function Row({
  icon, label, children, noBorder = false,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 20px',
      borderBottom: noBorder ? '0' : '1px solid var(--border)',
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--bg-soft)', color: 'var(--ink-3)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--ink-4)',
          textTransform: 'uppercase', letterSpacing: '.08em',
        }}>{label}</p>
        <div style={{ fontSize: 14, marginTop: 2 }}>{children}</div>
      </div>
    </div>
  )
}

