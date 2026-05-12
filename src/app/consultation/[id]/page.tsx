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
  }
  patient: {
    user: { email: string; medIntelCode: string | null }
  }
}

interface PatientHistory {
  recordCount: number
  grouped: {
    ALLERGY:      { id: string; title: string }[]
    CHRONIC_MED:  { id: string; title: string }[]
    SURGERY:      { id: string; title: string }[]
    LAB_REPORT:   { id: string; title: string }[]
    PRESCRIPTION: { id: string; title: string }[]
  }
}

// ── doctor view ───────────────────────────────────────────────────────────────

type DoctorPhase = 'loading' | 'pre' | 'call' | 'prescription' | 'done'

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

  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Doctor Console</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      {(history || appointment?.aiSummary) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
          {appointment?.aiSummary && (
            <p className="text-gray-700">
              <strong>AI Summary:</strong> {appointment.aiSummary}
              {appointment.severityLevel && (
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                  appointment.severityLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  appointment.severityLevel === 'URGENT'   ? 'bg-yellow-100 text-yellow-700' :
                                                             'bg-green-100 text-green-700'
                }`}>
                  {appointment.severityLevel} ({appointment.severityScore}/10)
                </span>
              )}
            </p>
          )}
          {history && (
            <>
              <p className="text-gray-500 text-xs font-medium mt-2">
                PATIENT HISTORY — {history.recordCount} records
              </p>
              {history.grouped.ALLERGY.length > 0 && (
                <p className="text-red-700">
                  ⚠️ <strong>Allergies:</strong>{' '}
                  {history.grouped.ALLERGY.map(r => r.title).join(', ')}
                </p>
              )}
              {history.grouped.CHRONIC_MED.length > 0 && (
                <p className="text-amber-700">
                  💊 <strong>Chronic Meds:</strong>{' '}
                  {history.grouped.CHRONIC_MED.map(r => r.title).join(', ')}
                </p>
              )}
              {history.grouped.SURGERY.length > 0 && (
                <p className="text-gray-700">
                  🔪 <strong>Surgeries:</strong>{' '}
                  {history.grouped.SURGERY.map(r => r.title).join(', ')}
                </p>
              )}
            </>
          )}
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
        <PrescriptionUploader appointmentId={appointmentId} onUploaded={() => setPhase('done')} />
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

  async function joinCall() {
    setError('')
    try {
      const res  = await fetch('/api/consultation/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')
      setVideoToken(data.token)
      setRoomName(data.roomName)
      setPhase('call')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to call')
    }
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

      {phase === 'payment' && appointment && (
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
