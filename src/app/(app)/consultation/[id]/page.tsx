'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, FileText, Video, AlertCircle, Stethoscope } from 'lucide-react'
import { VideoCall } from '@/components/consultation/VideoCall'
import { PrescriptionUploader } from '@/components/consultation/PrescriptionUploader'
import { PaymentFlow } from '@/components/escrow/PaymentFlow'
import { Btn } from '@/components/design/Btn'
import { SeverityPill } from '@/components/design/badges'

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

// ── shared building blocks ────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={40} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
    </div>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
      borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--red-600)',
    }}>
      <AlertCircle size={14} style={{ flex: 'none', marginTop: 2 }} />
      <div>{children}</div>
    </div>
  )
}

function AISummary({ summary, level, score }: {
  summary: string
  level?: string | null
  score?: number | null
}) {
  return (
    <div style={{
      background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)',
      borderRadius: 14, padding: 14,
      display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13, lineHeight: 1.55,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 10, flex: 'none',
        background: 'rgba(245,158,11,.18)', color: '#a16207',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Stethoscope size={16} strokeWidth={2} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ color: '#a16207', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            AI suggestion · verify clinically
          </strong>
          {level && (
            <SeverityPill level={level === 'CRITICAL' ? 'EMERGENCY' : level === 'URGENT' ? 'URGENT' : 'ROUTINE'} />
          )}
          {score != null && (
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              {score}/10
            </span>
          )}
        </div>
        <p style={{ margin: '6px 0 0', color: 'var(--ink-2)' }}>{summary}</p>
      </div>
    </div>
  )
}

// ── doctor view ───────────────────────────────────────────────────────────────

type DoctorPhase = 'loading' | 'pre' | 'call' | 'prescription' | 'done'

function HistoryGroup({ label, color, icon, records }: {
  label: string; color: string; icon: string; records: PatientHistoryRecord[]
}) {
  if (records.length === 0) return null
  return (
    <div>
      <p style={{
        margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
        color, marginBottom: 6,
      }}>{icon} {label}</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {records.map(r => (
          <li key={r.id} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            <span style={{ fontWeight: 600 }}>{r.title}</span>
            {r.content && <span style={{ color: 'var(--ink-3)' }}> — {r.content}</span>}
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
      const statusRes = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'start' }),
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
      setVideoToken(data.token); setRoomName(data.roomName); setPhase('call')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to call')
    }
  }

  async function completeWithoutRx() {
    if (!confirm('End this consultation WITHOUT issuing a prescription? The patient will not be billed and any held payment can be refunded.')) return
    setError('')
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'complete' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark complete')
    }
  }

  if (phase === 'loading') return <Spinner />

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet-600)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Doctor console
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Consultation
        </h1>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {appointment?.aiSummary && (
            <AISummary
              summary={appointment.aiSummary}
              level={appointment.severityLevel}
              score={appointment.severityScore}
            />
          )}

          {phase === 'pre' && (
            <Btn kind="primary" full onClick={joinCall} leading={<Video size={18} />}>
              Start video call
            </Btn>
          )}

          {phase === 'call' && videoToken && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('prescription')} />
              <p style={{ margin: 0, fontSize: 12, textAlign: 'center', color: 'var(--ink-3)' }}>
                End the call to upload the prescription and collect payment.
              </p>
            </div>
          )}

          {phase === 'prescription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PrescriptionUploader appointmentId={appointmentId} onUploaded={() => setPhase('done')} />
              <button
                onClick={completeWithoutRx}
                style={{
                  background: 'transparent', border: 0, padding: 8,
                  color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                End without prescription (no charge)
              </button>
            </div>
          )}

          {phase === 'done' && (
            <DonePanel
              title="Prescription saved. Payment released."
              backHref="/doctor/dashboard"
              backLabel="Back to dashboard"
            />
          )}

          {appointment && (phase === 'prescription' || phase === 'done') && (
            <a
              href={`/api/appointments/${appointmentId}/prescription.pdf`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: 'var(--blue-700)', textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <FileText size={14} /> Download consultation summary (PDF)
            </a>
          )}
        </div>

        <aside style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 18, padding: 18,
          display: 'flex', flexDirection: 'column', gap: 16,
          height: 'fit-content', position: 'sticky', top: 20,
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
              color: 'var(--ink-4)',
            }}>Patient</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {appointment?.patient?.user?.email}
            </p>
            <p className="mono" style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
              {appointment?.patient?.user?.medIntelCode ?? '—'}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
              color: 'var(--ink-4)', marginBottom: 10,
            }}>
              Medical history {history && `(${history.recordCount})`}
            </p>
            {!history && <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>Loading…</p>}
            {history && history.recordCount === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>No prior records.</p>
            )}
            {history && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HistoryGroup label="Allergies"     icon="⚠️" color="var(--red-600)"        records={history.grouped.ALLERGY} />
                <HistoryGroup label="Chronic meds"  icon="💊" color="#a16207"               records={history.grouped.CHRONIC_MED} />
                <HistoryGroup label="Surgeries"     icon="🔪" color="var(--ink-2)"          records={history.grouped.SURGERY} />
                <HistoryGroup label="Lab reports"   icon="🧪" color="var(--blue-700)"       records={history.grouped.LAB_REPORT} />
                <HistoryGroup label="Prescriptions" icon="📋" color="#047857"               records={history.grouped.PRESCRIPTION} />
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
  const [needsConsent, setNeedsConsent] = useState(false)

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
      if (res.status === 412 && data.code === 'CONSENT_REQUIRED') { setNeedsConsent(true); return }
      if (!res.ok) throw new Error(data.error ?? 'Failed to join')
      setVideoToken(data.token); setRoomName(data.roomName); setPhase('call')
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

  if (phase === 'loading') return <Spinner />

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Your consultation
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          {appointment?.doctor?.specialization ?? 'Consultation'}
        </h1>
      </header>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {phase === 'payment' && appointment && !appointment.doctor && (
        <div style={{
          background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 14, padding: 16, color: 'var(--ink-2)',
          display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13,
        }}>
          <strong style={{ color: '#a16207' }}>No doctor assigned yet</strong>
          <p style={{ margin: 0 }}>Pick a doctor before continuing to payment.</p>
          <Link href="/intake" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
            Start triage →
          </Link>
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
        <div style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 28, boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
        }}>
          <span style={{
            width: 64, height: 64, borderRadius: 999,
            background: 'rgba(16,185,129,.12)', color: 'var(--emerald-500)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={32} strokeWidth={2.5} />
          </span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
              Payment confirmed — funds held in escrow
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              Funds release to doctor only after prescription is uploaded.
            </p>
          </div>
          <Btn kind="primary" full onClick={joinCall} leading={<Video size={18} />}>
            Join video call
          </Btn>
        </div>
      )}

      {needsConsent && (
        <ConsentModal onCancel={() => setNeedsConsent(false)} onConsent={consentAndJoin} />
      )}

      {phase === 'call' && videoToken && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('done')} />
          <p style={{ margin: 0, fontSize: 12, textAlign: 'center', color: 'var(--ink-4)' }}>
            The call is recording for safety. Your prescription will appear in Medical History.
          </p>
        </div>
      )}

      {phase === 'done' && (
        <DonePanel
          title="Consultation complete"
          sub="Your prescription has been added to your medical vault."
          backHref="/history"
          backLabel="View medical history"
        />
      )}
    </div>
  )
}

function DonePanel({ title, sub, backHref, backLabel }: {
  title: string; sub?: string; backHref: string; backLabel: string
}) {
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: '36px 24px', boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center',
    }}>
      <span style={{
        width: 72, height: 72, borderRadius: 22,
        background: 'rgba(16,185,129,.12)', color: 'var(--emerald-500)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        animation: 'mi-fade-up 360ms var(--ease-out-quart) both',
      }}>
        <CheckCircle2 size={32} strokeWidth={2.5} />
      </span>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--ink)' }}>{title}</h2>
      {sub && <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', maxWidth: 380, lineHeight: 1.55 }}>{sub}</p>}
      <Link href={backHref} style={{ color: 'var(--blue-700)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        {backLabel} →
      </Link>
    </div>
  )
}

function ConsentModal({ onCancel, onConsent }: { onCancel: () => void; onConsent: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      animation: 'mi-fade-in 200ms ease both',
    }}>
      <div style={{
        background: 'var(--bg-elev)', borderRadius: 20,
        maxWidth: 460, width: '100%', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 30px 80px -30px rgba(0,0,0,.4)',
        animation: 'mi-modal-in 280ms var(--ease-out-quart) both',
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Recording consent</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0 }}>This consultation will be <strong>video and audio recorded</strong> for:</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Generating your medical record &amp; SOAP note</li>
            <li>Patient safety &amp; dispute resolution (PMDC requirement)</li>
            <li>Doctor quality assurance</li>
          </ul>
          <p style={{ margin: 0 }}>
            Recordings are encrypted at rest. Raw transcript is purged after 12 months; structured
            medical fields are retained as part of your medical history.
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-4)' }}>
            You can request deletion at any time via your account settings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Btn kind="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn kind="primary" onClick={onConsent}>I consent — join call</Btn>
        </div>
      </div>
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
      .then((s: { user?: { role?: string } } | null) => setRole(s?.user?.role ?? null))
      .catch(() => setRole(null))
  }, [])

  if (role === null) return <Spinner />

  if (role === 'DOCTOR') return <DoctorConsultation appointmentId={appointmentId} />
  return <PatientConsultation appointmentId={appointmentId} />
}
