'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search } from 'lucide-react'
import { AppointmentStatusPill, SeverityPill } from '@/components/design/badges'

interface Appointment {
  id: string
  status: string
  scheduledAt: string
  severityLevel: string | null
  aiSummary: string | null
  patient: {
    user: { name: string | null; email: string; medIntelCode: string | null }
  }
  escrow: { status: string } | null
}

export default function DoctorPatientsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<string>('ALL')
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    setLoading(true)
    const qs = filter !== 'ALL' ? `?status=${filter}` : ''
    fetch(`/api/doctor/queue${qs}`)
      .then(r => r.json())
      .then(data => { setAppointments(data.appointments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const filtered = appointments.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.patient.user.name?.toLowerCase().includes(q) ||
      a.patient.user.email.toLowerCase().includes(q) ||
      a.patient.user.medIntelCode?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{
      maxWidth: 920, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-600)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Doctor console
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            My patients
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            All appointments assigned to you.
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.20)',
        }}>
          <Users size={13} style={{ color: 'var(--blue-700)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-700)' }}>{appointments.length} total</span>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map(s => {
          const active = filter === s
          return (
            <button key={s} onClick={() => setFilter(s)} className="focus-ring"
              style={{
                padding: '6px 12px', borderRadius: 999,
                border: '1px solid ' + (active ? 'var(--ink)' : 'var(--border)'),
                background: active ? 'var(--ink)' : 'var(--bg-elev)',
                color: active ? 'var(--bg)' : 'var(--ink-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 200ms var(--ease-out-quart)',
              }}>
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          )
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or MedIntel code…"
          style={{
            width: '100%', padding: '12px 14px 12px 40px',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--bg-elev)', color: 'var(--ink)',
            fontSize: 14, outline: 'none',
            fontFamily: 'var(--font-ui)',
          }}
          onFocus={e => { e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,.14)'; e.target.style.borderColor = 'var(--blue-600)' }}
          onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = 'var(--border)' }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              height: 96, borderRadius: 18,
              background: 'linear-gradient(90deg, var(--bg-soft) 0%, var(--bg-elev) 50%, var(--bg-soft) 100%)',
              backgroundSize: '200% 100%',
              animation: 'mi-shimmer 1.4s linear infinite',
              border: '1px solid var(--border)',
            }} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
          <span style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'var(--bg-soft)', color: 'var(--ink-4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <Users size={28} />
          </span>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--ink-2)' }}>No patients found</p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            {filter !== 'ALL' ? 'Try changing the filter' : 'Patients will appear here once appointments are booked.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(a => {
          const name = a.patient.user.name ?? a.patient.user.email
          return (
            <div
              key={a.id}
              onClick={() => router.push(`/consultation/${a.id}`)}
              style={{
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-card)',
                cursor: 'pointer',
                transition: 'transform 240ms var(--ease-out-quart), box-shadow 240ms var(--ease-out-quart), border-color 240ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,.30)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 44, height: 44, borderRadius: 14,
                    background: 'var(--bg-soft)', color: 'var(--ink-2)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flex: 'none',
                  }}>{name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{name}</p>
                    <p className="mono" style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>
                      {a.patient.user.medIntelCode ?? a.patient.user.email}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {a.severityLevel && (
                    <SeverityPill level={a.severityLevel === 'CRITICAL' ? 'EMERGENCY' : a.severityLevel === 'URGENT' ? 'URGENT' : 'ROUTINE'} />
                  )}
                  <AppointmentStatusPill status={a.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'} />
                </div>
              </div>
              {a.aiSummary && (
                <p style={{
                  margin: '10px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{a.aiSummary}</p>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                  {new Date(a.scheduledAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-700)' }}>Open consultation →</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
