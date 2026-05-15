'use client'
import { useEffect, useState, use } from 'react'
import { VideoCall } from '@/components/consultation/VideoCall'
import { PrescriptionUploader } from '@/components/consultation/PrescriptionUploader'
import { PaymentFlow } from '@/components/escrow/PaymentFlow'

// ── shared types ──────────────────────────────────────────────────────────────

interface AppointmentData {
  id:           string
  aiSummary?:   string | null
  department?:  string | null
  severityScore?: number | null
  severityLevel?: string | null
  escrow?:      { status: string } | null
  doctor: {
    specialization:  string
    consultationFee: string | number
    user: { email: string }
  } | null
  patient: {
    user: { email: string; medIntelCode: string | null }
  }
}

interface PatientHistoryRecord { id: string; title: string; content?: string; recordedAt?: string }
interface PatientHistory {
  recordCount: number
  grouped: {
    ALLERGY:      PatientHistoryRecord[]
    CHRONIC_MED:  PatientHistoryRecord[]
    SURGERY:      PatientHistoryRecord[]
    LAB_REPORT:   PatientHistoryRecord[]
    PRESCRIPTION: PatientHistoryRecord[]
  }
}

// ── doctor view ───────────────────────────────────────────────────────────────

type DoctorPhase = 'loading' | 'pre' | 'call' | 'prescription' | 'done'

function HistoryGroup({ label, color, icon, records }: { label: string; color: string; icon: string; records: PatientHistoryRecord[] }) {
  if (records.length === 0) return null
  return (
    <div>
      <p className={`text-xs font-bold uppercase tracking-wider ${color} mb-1.5`}>{icon} {label}</p>
      <ul className="space-y-1 text-sm">
        {records.map(r => (
          <li key={r.id} className="text-slate-700 dark:text-slate-200">
            <span className="font-medium">{r.title}</span>
            {r.content && <span className="text-slate-500 dark:text-slate-400"> — {r.content}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DoctorConsultation({ appointmentId }: { appointmentId: string }) {
  const [phase,       setPhase]       = useState<DoctorPhase>('loading')
  const [videoToken,  setVideoToken]  = useState<string | null>(null)
  const [roomName,    setRoomName]    = useState('')
  const [history,     setHistory]     = useState<PatientHistory | null>(null)
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [error,       setError]       = useState('')

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then(r => r.json())
      .then(async (data: AppointmentData) => {
        setAppointment(data)
        setPhase('pre')
        const code = data.patient?.user?.medIntelCode
        if (code) {
          const hr = await fetch(`/api/records/lookup?code=${code}`)
          if (hr.ok) setHistory(await hr.json())
        }
      })
      .catch(() => setError('Could not load appointment'))
  }, [appointmentId])

  async function joinCall() {
    setError('')
    try {
      // Flip status SCHEDULED -> IN_PROGRESS the moment the doctor commits to
      // joining. Patient-side polling can use this to know the doctor's here.
      // Server enforces 'only when SCHEDULED'; we ignore the 409 case (already
      // started — e.g. dropped reconnect) and continue.
      const statusRes = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      if (!statusRes.ok && statusRes.status !== 409) {
        const err = await statusRes.json()
        throw new Error(err.error ?? 'Could not start consultation')
      }
      const res  = await fetch('/api/consultation/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start call')
      setVideoToken(data.token)
      setRoomName(data.roomName)
      setPhase('call')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to call')
    }
  }

  async function completeWithoutRx() {
    if (!confirm('End this consultation WITHOUT issuing a prescription? The patient will not be billed and any held payment can be refunded.')) return
    setError('')
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark complete')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  const severityTint =
    appointment?.severityLevel === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
    appointment?.severityLevel === 'URGENT'   ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Doctor Console</h1>
      {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded text-sm mb-4">{error}</div>}

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* ── Main consultation column ─────────────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {appointment?.aiSummary && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm">
              <p className="text-slate-700 dark:text-slate-200">
                <strong className="text-amber-700 dark:text-amber-300">AI suggestion (verify clinically):</strong> {appointment.aiSummary}
                {appointment.severityLevel && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${severityTint}`}>
                    {appointment.severityLevel} ({appointment.severityScore}/10)
                  </span>
                )}
              </p>
            </div>
          )}

      {phase === 'pre' && (
        <button
          onClick={joinCall}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors"
        >
          Start Video Call
        </button>
      )}

      {phase === 'call' && videoToken && (
        <div className="space-y-3">
          <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('prescription')} />
          <p className="text-sm text-center text-gray-500">
            End the call to upload the prescription and collect payment.
          </p>
        </div>
      )}

      {phase === 'prescription' && (
        <div className="space-y-3">
          <PrescriptionUploader appointmentId={appointmentId} onUploaded={() => setPhase('done')} />
          <button
            onClick={completeWithoutRx}
            className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
          >
            End without prescription (no charge)
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="text-center py-10 space-y-3">
          <div className="text-4xl">💰</div>
          <p className="font-semibold text-green-700 text-lg">Prescription saved. Payment released.</p>
          <a href="/doctor/dashboard" className="text-blue-600 hover:underline text-sm">
            Back to Dashboard →
          </a>
        </div>
      )}

          {/* PDF download for doctor too */}
          {appointment && (phase === 'prescription' || phase === 'done') && (
            <a
              href={`/api/appointments/${appointmentId}/prescription.pdf`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              📄 Download consultation summary (PDF)
            </a>
          )}
        </div>

        {/* ── Sidebar: full patient record ─────────────────────────────── */}
        <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4 h-fit lg:sticky lg:top-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Patient</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {appointment?.patient?.user?.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {appointment?.patient?.user?.medIntelCode ?? '—'}
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
              Medical history {history && `(${history.recordCount})`}
            </p>
            {!history && <p className="text-xs text-slate-500">Loading…</p>}
            {history && history.recordCount === 0 && (
              <p className="text-xs text-slate-500">No prior records.</p>
            )}
            {history && (
              <div className="space-y-3">
                <HistoryGroup label="Allergies"     icon="⚠️" color="text-red-600 dark:text-red-400"    records={history.grouped.ALLERGY} />
                <HistoryGroup label="Chronic meds"  icon="💊" color="text-amber-600 dark:text-amber-400" records={history.grouped.CHRONIC_MED} />
                <HistoryGroup label="Surgeries"     icon="🔪" color="text-slate-600 dark:text-slate-400" records={history.grouped.SURGERY} />
                <HistoryGroup label="Lab reports"   icon="🧪" color="text-blue-600 dark:text-blue-400"   records={history.grouped.LAB_REPORT} />
                <HistoryGroup label="Prescriptions" icon="📋" color="text-green-600 dark:text-green-400" records={history.grouped.PRESCRIPTION} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── patient view ──────────────────────────────────────────────────────────────

type PatientPhase = 'loading' | 'payment' | 'waiting' | 'call' | 'done'

function PatientConsultation({ appointmentId }: { appointmentId: string }) {
  const [phase,       setPhase]       = useState<PatientPhase>('loading')
  const [appointment, setAppointment] = useState<AppointmentData | null>(null)
  const [videoToken,  setVideoToken]  = useState<string | null>(null)
  const [roomName,    setRoomName]    = useState('')
  const [error,       setError]       = useState('')

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then(r => r.json())
      .then(data => {
        setAppointment(data)
        setPhase(data.escrow?.status === 'HELD' ? 'waiting' : 'payment')
      })
      .catch(() => setError('Could not load appointment'))
  }, [appointmentId])

  const [needsConsent, setNeedsConsent] = useState(false)

  async function joinCall() {
    setError('')
    try {
      const res  = await fetch('/api/consultation/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (res.status === 412 && data.code === 'CONSENT_REQUIRED') { setNeedsConsent(true); return }
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')
      setVideoToken(data.token)
      setRoomName(data.roomName)
      setPhase('call')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to call')
    }
  }

  async function consentAndJoin() {
    setError('')
    const res = await fetch(`/api/appointments/${appointmentId}/consent`, { method: 'POST' })
    if (!res.ok) { setError('Could not record consent. Try again.'); return }
    setNeedsConsent(false)
    joinCall()
  }

  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-3">Loading consultation...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Your Consultation</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      {phase === 'payment' && appointment && !appointment.doctor && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm space-y-2">
          <p className="font-semibold">No doctor assigned yet</p>
          <p>Pick a doctor before continuing to payment.</p>
          <a href="/intake" className="inline-block text-blue-600 hover:underline font-medium">Start triage →</a>
        </div>
      )}

      {phase === 'payment' && appointment && appointment.doctor && (
        <PaymentFlow
          appointmentId={appointmentId}
          doctorName={appointment.doctor.specialization}
          fee={Number(appointment.doctor.consultationFee)}
          onPaymentComplete={() => setPhase('waiting')}
        />
      )}

      {phase === 'waiting' && (
        <div className="space-y-4 text-center p-6 border rounded-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Payment confirmed — funds held in escrow</p>
            <p className="text-sm text-gray-500 mt-1">Funds release to doctor only after prescription is uploaded</p>
          </div>
          <button
            onClick={joinCall}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors"
          >
            Join Video Call
          </button>
        </div>
      )}

      {needsConsent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recording consent</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
              <p>This consultation will be <strong>video and audio recorded</strong> for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Generating your medical record &amp; SOAP note</li>
                <li>Patient safety &amp; dispute resolution (PMDC requirement)</li>
                <li>Doctor quality assurance</li>
              </ul>
              <p>Recordings are encrypted at rest. Raw transcript is purged after 12 months; structured medical fields are retained as part of your medical history.</p>
              <p className="text-xs text-slate-500">You can request deletion at any time via your account settings.</p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setNeedsConsent(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:underline">
                Cancel
              </button>
              <button onClick={consentAndJoin} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
                I consent — join call
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'call' && videoToken && (
        <div className="space-y-3">
          <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('done')} />
          <p className="text-xs text-gray-400 text-center">
            The call is recording for safety. Your prescription will appear in Medical History.
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div className="text-center space-y-4 py-12">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold">Consultation Complete</h2>
          <p className="text-gray-500">Your prescription has been added to your medical vault.</p>
          <a href="/history" className="inline-block mt-2 text-blue-600 hover:underline font-medium">
            View Medical History →
          </a>
        </div>
      )}
    </div>
  )
}

// ── role-switching shell ──────────────────────────────────────────────────────

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = use(params)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => setRole((s?.user as any)?.role ?? null))
      .catch(() => setRole(null))
  }, [])

  if (role === null) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (role === 'DOCTOR') return <DoctorConsultation appointmentId={appointmentId} />
  return <PatientConsultation appointmentId={appointmentId} />
}
