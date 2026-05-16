'use client'
import { useEffect, useState } from 'react'
import { MedicalTimeline } from '@/components/records/MedicalTimeline'
import { RecordUploader } from '@/components/records/RecordUploader'
import { Plus, X, Download, FileText, Calendar, Trash2, Loader2, Star } from 'lucide-react'
import { ReviewForm } from '@/components/reviews/ReviewForm'
import { Btn } from '@/components/design/Btn'
import { AppointmentStatusPill, SeverityPill } from '@/components/design/badges'

interface MedicalRecord {
  id: string
  type: string
  title: string
  content: string
  recordedAt: string
  fileUrl?: string | null
}

interface Appointment {
  id:               string
  scheduledAt:      string
  completedAt:      string | null
  status:           string
  department:       string | null
  severityLevel:    string | null
  severityScore:    number | null
  prescriptionText: string | null
  doctor: { specialization: string; user: { email: string; name: string | null } } | null
  review: { id: string; rating: number } | null
}

const TYPE_LABELS: Record<string, string> = {
  ALL:          'All',
  PRESCRIPTION: 'Prescriptions',
  LAB_REPORT:   'Lab reports',
  SURGERY:      'Surgeries',
  ALLERGY:      'Allergies',
  CHRONIC_MED:  'Chronic meds',
}

export default function HistoryPage() {
  const [records,      setRecords]      = useState<MedicalRecord[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showUpload,   setShowUpload]   = useState(false)
  const [filter,       setFilter]       = useState('ALL')

  async function loadAll() {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([fetch('/api/records'), fetch('/api/appointments')])
      if (r1.ok) setRecords(await r1.json())
      if (r2.ok) {
        const d = await r2.json()
        setAppointments(d.appointments ?? [])
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  const [rescheduling, setRescheduling] = useState<string | null>(null)
  const [newAt,        setNewAt]        = useState('')
  const [actionBusy,   setActionBusy]   = useState<string | null>(null)

  async function reschedule(id: string) {
    if (!newAt) return
    setActionBusy(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scheduledAt: new Date(newAt).toISOString() }),
      })
      if (!res.ok) { alert((await res.json()).error ?? `HTTP ${res.status}`); return }
      setRescheduling(null); setNewAt('')
      loadAll()
    } finally { setActionBusy(null) }
  }

  async function cancel(id: string) {
    if (!confirm('Cancel this appointment? Held payment is refunded automatically.')) return
    const reason = prompt('Reason for cancellation (optional, helps us improve):') ?? ''
    setActionBusy(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'cancel', reason: reason.trim() || undefined }),
      })
      if (!res.ok) { alert((await res.json()).error ?? `HTTP ${res.status}`); return }
      loadAll()
    } finally { setActionBusy(null) }
  }

  const filtered = filter === 'ALL' ? records : records.filter(r => r.type === filter)

  return (
    <div style={{
      maxWidth: 760, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Medical vault
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            My medical history
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            {records.length} records in your vault
          </p>
        </div>
        <Btn kind={showUpload ? 'secondary' : 'primary'}
             onClick={() => setShowUpload(!showUpload)}
             leading={showUpload ? <X size={14} /> : <Plus size={14} />}>
          {showUpload ? 'Cancel' : 'Add record'}
        </Btn>
      </header>

      {showUpload && (
        <RecordUploader onUploaded={() => { loadAll(); setShowUpload(false) }} />
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_LABELS).map(([value, label]) => {
          const active = filter === value
          return (
            <button key={value} onClick={() => setFilter(value)} className="focus-ring"
              style={{
                padding: '6px 12px', borderRadius: 999,
                border: '1px solid ' + (active ? 'var(--ink)' : 'var(--border)'),
                background: active ? 'var(--ink)' : 'var(--bg-elev)',
                color: active ? 'var(--bg)' : 'var(--ink-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 200ms var(--ease-out-quart)',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {loading ? (
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
      ) : (
        <MedicalTimeline records={filtered} />
      )}

      {!loading && appointments.length > 0 && (
        <section style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <FileText size={16} style={{ color: 'var(--blue-700)' }} />
            Past consultations
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {appointments.map(a => (
              <li key={a.id} style={{
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 16, boxShadow: 'var(--shadow-card)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                        {a.doctor?.specialization ?? a.department ?? 'Consultation'}
                      </span>
                      <AppointmentStatusPill status={a.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'} />
                      {a.severityLevel && (
                        <SeverityPill level={a.severityLevel === 'CRITICAL' ? 'EMERGENCY' : a.severityLevel === 'URGENT' ? 'URGENT' : 'ROUTINE'} />
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)' }}>
                      {new Date(a.scheduledAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 'none' }}>
                    {a.status === 'COMPLETED' && (
                      <>
                        <a href={`/api/appointments/${a.id}/prescription.pdf`} target="_blank" rel="noreferrer"
                           style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
                          <Download size={12} /> Rx
                        </a>
                        <a href={`/api/appointments/${a.id}/claim.pdf`} target="_blank" rel="noreferrer"
                           title="Insurance claim PDF (State Life / Adamjee / EFU)"
                           style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
                          <FileText size={12} /> Claim
                        </a>
                      </>
                    )}
                    {a.status === 'SCHEDULED' && (
                      <>
                        <button onClick={() => { setRescheduling(rescheduling === a.id ? null : a.id); setNewAt('') }}
                                disabled={actionBusy === a.id}
                                style={iconLink('ink')}>
                          <Calendar size={12} /> Reschedule
                        </button>
                        <button onClick={() => cancel(a.id)} disabled={actionBusy === a.id}
                                style={iconLink('red')}>
                          {actionBusy === a.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {a.status === 'COMPLETED' && a.doctor && (
                  a.review ? (
                    <div style={{
                      borderTop: '1px solid var(--border)', paddingTop: 10,
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, color: 'var(--ink-3)',
                    }}>
                      <span>Your rating:</span>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13}
                              fill={i < a.review!.rating ? '#f59e0b' : 'transparent'}
                              stroke={i < a.review!.rating ? '#f59e0b' : 'var(--ink-4)'} />
                      ))}
                    </div>
                  ) : (
                    <ReviewForm
                      appointmentId={a.id}
                      onSubmitted={rating => setAppointments(prev =>
                        prev.map(x => x.id === a.id ? { ...x, review: { id: 'pending', rating } } : x)
                      )}
                    />
                  )
                )}

                {rescheduling === a.id && (
                  <div style={{
                    borderTop: '1px solid var(--border)', paddingTop: 10,
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
                  }}>
                    <input
                      type="datetime-local"
                      value={newAt}
                      onChange={e => setNewAt(e.target.value)}
                      min={new Date(Date.now() + 31 * 60_000).toISOString().slice(0, 16)}
                      style={{
                        padding: '8px 12px', fontSize: 13,
                        borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--bg-elev)', color: 'var(--ink)',
                      }}
                    />
                    <Btn kind="primary" disabled={!newAt || actionBusy === a.id} onClick={() => reschedule(a.id)}>
                      {actionBusy === a.id ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                    </Btn>
                    <Btn kind="ghost" onClick={() => { setRescheduling(null); setNewAt('') }}>
                      Cancel
                    </Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function iconLink(tone: 'ink' | 'red'): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'transparent', border: 0, padding: 0,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    color: tone === 'red' ? 'var(--red-600)' : 'var(--ink-2)',
  }
}
