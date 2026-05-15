'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { SymptomSummary } from '@/components/intake/SymptomSummary'
import { UploadDocs } from '@/components/intake/UploadDocs'
import { NearbyHospitals } from '@/components/resources/NearbyHospitals'
import { DoctorCard } from '@/components/triage/DoctorCard'
import { Mic, Keyboard, ChevronLeft, Loader2, ArrowRight, AlertCircle, Stethoscope, MapPin } from 'lucide-react'
import type { TriageResult } from '@/types'
import { Btn } from '@/components/design/Btn'

interface DoctorMatch {
  id: string
  specialization: string
  consultationFee: string | number
  yearsExperience: number
  rating: string | number | null
  reviewCount: number
  trustBadge: boolean
  bio: string | null
  user: { email: string }
}

interface IntakeResult extends TriageResult { triageId: string; transcript: string; summary: string }
type IntakeMode = 'choose' | 'voice' | 'text'

export default function IntakePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    }>
      <IntakeInner />
    </Suspense>
  )
}

function IntakeInner() {
  const router  = useRouter()
  const params  = useSearchParams()
  const [mode,      setMode]      = useState<IntakeMode>('choose')
  const [textInput, setTextInput] = useState('')
  const [result,    setResult]    = useState<IntakeResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [doctors,    setDoctors]    = useState<DoctorMatch[]>([])
  const [docsLoading, setDocsLoading] = useState(false)

  useEffect(() => {
    if (!result?.department) { setDoctors([]); return }
    setDocsLoading(true)
    fetch(`/api/doctors?department=${encodeURIComponent(result.department)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDoctors(d.slice(0, 3)) })
      .catch(() => {})
      .finally(() => setDocsLoading(false))
  }, [result?.department])

  useEffect(() => {
    const prefill = params.get('prefill')
    if (prefill && !textInput) {
      setTextInput(prefill)
      setMode('text')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVoiceComplete(blob: Blob, filename: string, language: string) {
    setLoading(true); setError(null)
    try {
      const form = new FormData()
      form.append('audio', blob, filename)
      form.append('language', language)
      const res  = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
      const raw  = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Processing failed') }
    finally { setLoading(false) }
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) return
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/voice/transcribe-text', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: textInput }),
      })
      const raw  = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
      setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed') }
    finally { setLoading(false) }
  }

  if (result) {
    const qs = new URLSearchParams({
      triageId: result.triageId,
      dept:     result.department,
      severity: result.severityLevel,
      score:    String(result.severityScore),
    })
    function bookDoctor(doctorId: string) {
      const p = new URLSearchParams({
        doctorId,
        triageId: result!.triageId,
        dept:     result!.department,
        severity: result!.severityLevel,
        score:    String(result!.severityScore),
      })
      router.push(`/book?${p.toString()}`)
    }
    return (
      <div style={{
        maxWidth: 760, margin: '0 auto',
        padding: '28px clamp(16px, 4vw, 32px) 64px',
        display: 'flex', flexDirection: 'column', gap: 22,
        animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
      }}>
        <SymptomSummary {...result} />

        <UploadDocs
          triageId={result.triageId}
          onRefined={updated => setResult({ ...result, ...updated })}
        />

        {/* ── Available doctors ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHeader
            Icon={Stethoscope}
            kicker="Step 1"
            title={`Best ${result.department} doctors`}
            sub="KYD-verified specialists available today, ranked by rating."
          />
          {docsLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  height: 124, borderRadius: 22,
                  background: 'linear-gradient(90deg, var(--bg-soft) 0%, var(--bg-elev) 50%, var(--bg-soft) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'mi-shimmer 1.4s linear infinite',
                  border: '1px solid var(--border)',
                }} />
              ))}
            </div>
          )}
          {!docsLoading && doctors.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '20px 16px',
              borderRadius: 14, border: '1px dashed var(--border)',
              color: 'var(--ink-3)', fontSize: 13,
            }}>
              No verified {result.department} specialists found yet.
            </div>
          )}
          {!docsLoading && doctors.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {doctors.map(d => <DoctorCard key={d.id} doctor={d} onBook={bookDoctor} />)}
              </div>
              <Btn kind="secondary" full
                   onClick={() => router.push(`/doctors?${qs.toString()}`)}
                   trailing={<ArrowRight size={16} strokeWidth={2} />}>
                See all {result.department} doctors
              </Btn>
            </>
          )}
        </section>

        {/* ── Nearby hospitals (only after doctor matching completes) ── */}
        {!docsLoading && (
          <section style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
          }}>
            <SectionHeader
              Icon={MapPin}
              kicker="Step 2"
              title="Nearest hospital or clinic"
              sub="In-person care near you, in case you'd rather walk in."
            />
            <NearbyHospitals />
          </section>
        )}

        <Btn kind="secondary" full onClick={() => { setResult(null); setMode('choose'); setDoctors([]) }}>
          Start over
        </Btn>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto',
      padding: '32px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          How are you feeling?
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Describe your symptoms — we&apos;ll find the right doctor for you.
        </p>
      </header>

      {mode === 'choose' && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14,
        }}>
          <ModeCard
            Icon={Mic}
            accent="red"
            title="Speak"
            sub="Urdu یا English"
            onClick={() => setMode('voice')}
          />
          <ModeCard
            Icon={Keyboard}
            accent="blue"
            title="Type"
            sub="Write symptoms"
            onClick={() => setMode('text')}
          />
        </div>
      )}

      {mode === 'voice' && (
        <div style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 22, boxShadow: 'var(--shadow-card)',
          animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px 0' }}>
            <button onClick={() => setMode('choose')} className="focus-ring" style={iconBtn}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Voice recording</span>
          </div>
          <VoiceRecorder onRecordingComplete={handleVoiceComplete} />
        </div>
      )}

      {mode === 'text' && (
        <div style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', gap: 14,
          animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setMode('choose')} className="focus-ring" style={iconBtn}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Describe your symptoms</span>
          </div>
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. I've had a severe headache for 2 days with nausea and sensitivity to light…"
            style={{
              width: '100%', minHeight: 160, padding: '12px 14px',
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg-soft)', color: 'var(--ink)',
              fontSize: 14, lineHeight: 1.5, resize: 'none',
              outline: 'none', fontFamily: 'var(--font-ui)',
            }}
            onFocus={e => { e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,.14)'; e.target.style.borderColor = 'var(--blue-600)' }}
            onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = 'var(--border)' }}
          />
          <Btn kind="primary" full
               disabled={loading || !textInput.trim()}
               onClick={handleTextSubmit}
               leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}
               trailing={loading ? null : <ArrowRight size={16} strokeWidth={2} />}>
            {loading ? 'Analyzing…' : 'Analyze symptoms'}
          </Btn>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '12px 14px',
          fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: 2 }} /> {error}
        </div>
      )}
    </div>
  )
}

/* ── mode card ── */
function ModeCard({ Icon, accent, title, sub, onClick }: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  accent: 'red' | 'blue'
  title: string
  sub: string
  onClick: () => void
}) {
  const map = {
    red:  { fg: 'var(--red-600)',   bg: 'rgba(239,68,68,.10)',  hover: 'rgba(239,68,68,.18)' },
    blue: { fg: 'var(--blue-700)', bg: 'rgba(37,99,235,.10)',  hover: 'rgba(37,99,235,.18)' },
  } as const
  const m = map[accent]
  return (
    <button
      onClick={onClick}
      className="focus-ring"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: 28,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 240ms var(--ease-out-quart), box-shadow 240ms var(--ease-out-quart), border-color 240ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
    >
      <span style={{
        width: 64, height: 64, borderRadius: 20,
        background: m.bg, color: m.fg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={28} strokeWidth={2} />
      </span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>
      </div>
    </button>
  )
}

function SectionHeader({ Icon, kicker, title, sub }: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  kicker: string
  title: string
  sub?: string
}) {
  return (
    <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{
        width: 36, height: 36, borderRadius: 12,
        background: 'rgba(37,99,235,.10)', color: 'var(--blue-700)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      }}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {kicker}
        </span>
        <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
          {title}
        </h2>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>{sub}</p>}
      </div>
    </header>
  )
}

const iconBtn: React.CSSProperties = {
  padding: 6, borderRadius: 8,
  background: 'transparent', border: 0, cursor: 'pointer',
  color: 'var(--ink-3)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
