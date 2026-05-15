'use client'
import { useEffect, useState } from 'react'
import { MedicalTimeline } from '@/components/records/MedicalTimeline'
import { RecordUploader } from '@/components/records/RecordUploader'
import { Button } from '@/components/ui/button'
import { Plus, X, Download, FileText, Calendar, Trash2, Loader2, Star } from 'lucide-react'
import { ReviewForm } from '@/components/reviews/ReviewForm'

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

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED:   'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  REFUNDED:    'Refunded',
}
const SEVERITY_TINT: Record<string, string> = {
  ROUTINE:  'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  URGENT:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  CRITICAL: 'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
}

const TYPE_LABELS: Record<string, string> = {
  ALL:          'All',
  PRESCRIPTION: 'Prescriptions',
  LAB_REPORT:   'Lab Reports',
  SURGERY:      'Surgeries',
  ALLERGY:      'Allergies',
  CHRONIC_MED:  'Chronic Meds',
}

export default function HistoryPage() {
  const [records, setRecords]           = useState<MedicalRecord[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [showUpload, setShowUpload]     = useState(false)
  const [filter, setFilter]             = useState('ALL')

  async function loadAll() {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([fetch('/api/records'), fetch('/api/appointments')])
      if (r1.ok) setRecords(await r1.json())
      if (r2.ok) {
        const d = await r2.json()
        setAppointments(d.appointments ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const [rescheduling, setRescheduling] = useState<string | null>(null)
  const [newAt, setNewAt]               = useState('')
  const [actionBusy, setActionBusy]     = useState<string | null>(null)

  async function reschedule(id: string) {
    if (!newAt) return
    setActionBusy(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: new Date(newAt).toISOString() }),
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
        body: JSON.stringify({ action: 'cancel', reason: reason.trim() || undefined }),
      })
      if (!res.ok) { alert((await res.json()).error ?? `HTTP ${res.status}`); return }
      loadAll()
    } finally { setActionBusy(null) }
  }

  const filtered = filter === 'ALL' ? records : records.filter(r => r.type === filter)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Medical History</h1>
          <p className="text-sm text-slate-500">{records.length} records in your vault</p>
        </div>
        <Button
          variant={showUpload ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? <><X className="w-4 h-4 mr-1" /> Cancel</> : <><Plus className="w-4 h-4 mr-1" /> Add Record</>}
        </Button>
      </div>

      {showUpload && (
        <RecordUploader onUploaded={() => { loadAll(); setShowUpload(false) }} />
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <MedicalTimeline records={filtered} />
      )}

      {!loading && appointments.length > 0 && (
        <section className="pt-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Past consultations
          </h2>
          <ul className="space-y-2">
            {appointments.map(a => (
              <li
                key={a.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3"
              >
                <div className="flex items-start gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                        {a.doctor?.specialization ?? a.department ?? 'Consultation'}
                      </span>
                      {a.severityLevel && (
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${SEVERITY_TINT[a.severityLevel] ?? ''}`}>
                          AI: {a.severityLevel}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-slate-400">
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(a.scheduledAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {a.status === 'COMPLETED' && (
                      <a
                        href={`/api/appointments/${a.id}/prescription.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    )}
                    {a.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => { setRescheduling(rescheduling === a.id ? null : a.id); setNewAt('') }}
                          disabled={actionBusy === a.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Calendar className="w-3 h-3" /> Reschedule
                        </button>
                        <button
                          onClick={() => cancel(a.id)}
                          disabled={actionBusy === a.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
                        >
                          {actionBusy === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {a.status === 'COMPLETED' && a.doctor && (
                  a.review ? (
                    <div className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <span>Your rating:</span>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < a.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
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
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                    <input
                      type="datetime-local"
                      value={newAt}
                      onChange={e => setNewAt(e.target.value)}
                      min={new Date(Date.now() + 31 * 60_000).toISOString().slice(0, 16)}
                      className="px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={() => reschedule(a.id)}
                      disabled={!newAt || actionBusy === a.id}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
                    >
                      {actionBusy === a.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Confirm'}
                    </button>
                    <button
                      onClick={() => { setRescheduling(null); setNewAt('') }}
                      className="px-3 py-1.5 text-slate-600 dark:text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
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
