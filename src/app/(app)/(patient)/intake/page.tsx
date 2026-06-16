'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { SymptomSummary } from '@/components/intake/SymptomSummary'
import { UploadDocs } from '@/components/intake/UploadDocs'
import { NearbyHospitals } from '@/components/resources/NearbyHospitals'
import { DoctorCard } from '@/components/triage/DoctorCard'
import { Mic, Keyboard, ChevronLeft, Loader2, ArrowRight, AlertCircle, Stethoscope, MapPin, WifiOff, Clock, Check, Trash2, MessageCircle } from 'lucide-react'
import type { TriageResult } from '@/types'
import { Btn } from '@/components/design/Btn'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useVoiceQueue } from '@/hooks/useVoiceQueue'

interface DoctorMatch {
  id: string
  specialization: string
  consultationFee: string | number
  yearsExperience: number
  rating: string | number | null
  reviewCount: number
  trustBadge: boolean
  bio: string | null
  languages?: string[]
  tier?: string
  score?: number
  user: { email: string }
}

interface IntakeResult extends TriageResult { triageId: string; transcript: string; summary: string; confidence?: number }

interface FollowupQuestion {
  en: string
  ur: string
  slot: string
}

type IntakeMode = 'choose' | 'voice' | 'text'
type ProcessingStep = 'transcribing' | 'analyzing' | 'matching' | 'followup'

const STEPS = [
  { num: 1, label: 'Describe' },
  { num: 2, label: 'Review' },
  { num: 3, label: 'Doctor' },
] as const

const MAX_FOLLOWUP_ROUNDS = 2

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

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
      {STEPS.map((step, i) => {
        const isActive = current === step.num
        const isComplete = current > step.num
        const isLast = i === STEPS.length - 1
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40 scale-110'
                  : isComplete
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                {isComplete ? <Check className="w-4 h-4" /> : step.num}
              </span>
              <span className={`text-xs font-medium hidden sm:inline transition-colors ${
                isActive ? 'text-slate-800 dark:text-slate-100' : isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <span className={`w-8 h-px mx-2 transition-colors ${
                isComplete ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </div>
        )
      })}
    </div>
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
  const [queued,    setQueued]    = useState(false)

  const isOnline = useOnlineStatus()

  const [deleting, setDeleting] = useState(false)
  const [procStep, setProcStep] = useState<ProcessingStep>('transcribing')
  const [language, setLanguage] = useState('ur')

  // Follow-up state
  const [followupQs, setFollowupQs] = useState<FollowupQuestion[]>([])
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([])
  const [followupRound, setFollowupRound] = useState(0)
  const [showFollowup, setShowFollowup] = useState(false)
  const [followupLoading, setFollowupLoading] = useState(false)

  async function uploadVoice(blob: Blob, filename: string, lang: string) {
    const form = new FormData()
    form.append('audio', blob, filename)
    form.append('language', lang)
    const res  = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
    const raw  = await res.text()
    const data = raw ? JSON.parse(raw) : {}
    if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
    setResult(data)
  }

  const { queueLength, draining, addToQueue } = useVoiceQueue(uploadVoice)

  useEffect(() => {
    if (!result?.department) { setDoctors([]); return }
    setDocsLoading(true)
    const p = new URLSearchParams({ department: result.department, severity: String(result.severityScore) })
    if (language) p.set('language', language)
    fetch(`/api/doctors?${p.toString()}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDoctors(d.slice(0, 3)) })
      .catch(e => console.error('[intake] doctor fetch failed', e))
      .finally(() => setDocsLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.department, result?.severityScore])

  useEffect(() => {
    const prefill = params.get('prefill')
    if (prefill && !textInput) {
      setTextInput(prefill)
      setMode('text')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleVoiceComplete(blob: Blob, filename: string, lang: string) {
    setLanguage(lang)
    setLoading(true); setError(null); setQueued(false)
    setProcStep('transcribing')
    try {
      await uploadVoice(blob, filename, lang)
    } catch (e) {
      if (!isOnline || e instanceof TypeError) {
        await addToQueue(blob, filename, lang)
        setQueued(true)
        setError(null)
      } else {
        setError(e instanceof Error ? e.message : 'Processing failed')
      }
    } finally { setLoading(false) }
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) return
    setLoading(true); setError(null)
    setProcStep('analyzing')
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

      // Check if follow-up is needed
      if (data.confidence != null && data.confidence < 0.7) {
        await triggerFollowup(textInput, data)
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed') }
    finally { setLoading(false) }
  }

  async function triggerFollowup(originalText: string, triageData: IntakeResult) {
    setFollowupLoading(true)
    try {
      const res = await fetch('/api/triage/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: originalText, triage: { ...triageData, confidence: triageData.confidence ?? 0.5 } }),
      })
      const data = await res.json()
      if (data.followups?.questions?.length > 0) {
        setFollowupQs(data.followups.questions)
        setFollowupAnswers(new Array(data.followups.questions.length).fill(''))
        setShowFollowup(true)
        setFollowupRound(1)
        setProcStep('followup')
      }
    } catch (e) {
      console.error('[intake] followup fetch failed', e)
    } finally {
      setFollowupLoading(false)
    }
  }

  async function handleFollowupSubmit() {
    const combinedAnswers = followupQs.map((q, i) => `${q.en}: ${followupAnswers[i] ?? ''}`).join('\n')
    setFollowupLoading(true)
    setShowFollowup(false)
    try {
      const res = await fetch('/api/voice/transcribe-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${result?.transcript ?? ''}\n\nFollow-up answers:\n${combinedAnswers}` }),
      })
      const raw = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? 'Re-analysis failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Follow-up analysis failed')
    } finally {
      setFollowupLoading(false)
    }
  }

  async function handleClearData() {
    if (!result?.triageId) return
    setDeleting(true)
    try {
      await fetch(`/api/triage/${result.triageId}/cleanup`, { method: 'POST' })
    } catch (e) {
      console.error('[intake] cleanup failed', e)
    }
    setDeleting(false)
    setResult(null); setMode('choose'); setDoctors([])
    setFollowupQs([]); setFollowupAnswers([]); setShowFollowup(false); setFollowupRound(0)
  }

  const step = result ? 3 : (mode !== 'choose' ? 2 : 1)

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

    // Follow-up UI — shown as an overlay before doctor cards
    const showFollowupSection = showFollowup && followupQs.length > 0 && followupRound <= MAX_FOLLOWUP_ROUNDS

    return (
      <div style={{
        maxWidth: 760, margin: '0 auto',
        padding: '28px clamp(16px, 4vw, 32px) 64px',
        display: 'flex', flexDirection: 'column', gap: 22,
      }}>
        <StepIndicator current={3} />

        {showFollowupSection ? (
          <div style={{
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 22, padding: 24, boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <span style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(37,99,235,.10)', color: 'var(--blue-700)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageCircle size={18} strokeWidth={2} />
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                  A few more details
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
                  Round {followupRound}/{MAX_FOLLOWUP_ROUNDS} — help us refine the assessment
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {followupQs.map((q, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>
                    {q.en}
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                    {q.ur}
                  </label>
                  <textarea
                    value={followupAnswers[i] ?? ''}
                    onChange={e => {
                      const next = [...followupAnswers]
                      next[i] = e.target.value
                      setFollowupAnswers(next)
                    }}
                    placeholder="Your answer…"
                    style={{
                      width: '100%', minHeight: 60, padding: '10px 12px',
                      borderRadius: 12, border: '1px solid var(--border)',
                      background: 'var(--bg-soft)', color: 'var(--ink)',
                      fontSize: 13, lineHeight: 1.5, resize: 'none',
                      outline: 'none', fontFamily: 'var(--font-ui)',
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <Btn kind="primary" full
                   disabled={followupLoading}
                   onClick={handleFollowupSubmit}
                   leading={followupLoading ? <Loader2 size={16} className="animate-spin" /> : null}>
                {followupLoading ? 'Re-analyzing…' : 'Submit answers'}
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <SymptomSummary {...result} />
            <UploadDocs
              triageId={result.triageId}
              onRefined={updated => setResult({ ...result, ...updated })}
            />

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'rgba(37,99,235,.10)', color: 'var(--blue-700)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                }}>
                  <Stethoscope size={18} strokeWidth={2} />
                </span>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                    Step 1
                  </span>
                  <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
                    Best {result.department} doctors
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
                    KYD-verified specialists ranked by match score.
                  </p>
                </div>
              </header>
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
                  textAlign: 'center', padding: '24px 16px',
                  borderRadius: 14, border: '1px dashed var(--border)',
                  color: 'var(--ink-3)', fontSize: 13,
                }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>No verified {result.department} specialists found yet.</p>
                  <p style={{ color: 'var(--ink-4)' }}>Try browsing all doctors or visit a nearby clinic instead.</p>
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

            {!docsLoading && (
              <section style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
              }}>
                <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'rgba(37,99,235,.10)', color: 'var(--blue-700)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                  }}>
                    <MapPin size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Step 2
                    </span>
                    <h2 style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
                      Nearest hospital or clinic
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
                      In-person care near you, in case you&apos;d rather walk in.
                    </p>
                  </div>
                </header>
                <NearbyHospitals />
              </section>
            )}

            <div className="flex items-center justify-between pt-2">
              <button onClick={handleClearData} disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50">
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Clear this session
              </button>
              <Btn kind="secondary" onClick={() => { setResult(null); setMode('choose'); setDoctors([]) }}>
                Start over
              </Btn>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 640, margin: '0 auto',
      padding: '32px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <StepIndicator current={step} />

      <header style={{ textAlign: 'center', marginTop: 4 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          {mode === 'choose' ? 'How are you feeling?' : 'Describe your symptoms'}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          {mode === 'choose'
            ? 'Describe your symptoms — we\'ll find the right doctor for you.'
            : 'Speak or type naturally — our AI understands Urdu, Pashto, Punjabi, Sindhi, and English'
          }
        </p>
      </header>

      {!isOnline && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.35)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <WifiOff size={16} style={{ color: '#d97706', flex: 'none', marginTop: 2 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400e' }}>No internet connection</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b45309' }}>
              You can record and type symptoms — they&apos;ll upload automatically when you reconnect.
              For emergencies call <strong>1122</strong> or <strong>115</strong>.
            </p>
          </div>
        </div>
      )}

      {(queued || queueLength > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.25)',
          borderRadius: 14, padding: '12px 16px',
        }}>
          {draining
            ? <Loader2 size={15} style={{ color: 'var(--blue-600)', flex: 'none', animation: 'spin 1s linear infinite' }} />
            : <Clock size={15} style={{ color: 'var(--blue-600)', flex: 'none' }} />
          }
          <p style={{ margin: 0, fontSize: 13, color: 'var(--blue-700)' }}>
            {draining
              ? 'Uploading your saved recording…'
              : `${queueLength} recording${queueLength > 1 ? 's' : ''} saved — will upload when connected.`}
          </p>
        </div>
      )}

      {mode === 'choose' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}>
          {!isOnline ? (
            <>
              <ModeCard Icon={Keyboard} accent="blue" title="Type" sub="Works offline" onClick={() => setMode('text')} />
              <ModeCard Icon={Mic} accent="red" title="Speak" sub="Urdu یا English" onClick={() => setMode('voice')} />
            </>
          ) : (
            <>
              <ModeCard Icon={Mic} accent="red" title="Speak" sub="Urdu یا English" onClick={() => setMode('voice')} />
              <ModeCard Icon={Keyboard} accent="blue" title="Type" sub="Write symptoms" onClick={() => setMode('text')} />
            </>
          )}
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
          <VoiceRecorder onRecordingComplete={handleVoiceComplete} onProgressChange={setProcStep} />
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
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '12px 14px',
          fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: 2 }} /> {error}
        </div>
      )}

      {/* Real processing progress banner */}
      {loading && (
        <div style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 18px', boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-600)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              {procStep === 'transcribing' && 'Transcribing your audio…'}
              {procStep === 'analyzing' && 'Analyzing your symptoms…'}
              {procStep === 'matching' && 'Finding the best doctors…'}
              {procStep === 'followup' && 'Preparing follow-up questions…'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['transcribing', 'analyzing', 'matching'].map(s => {
              const idx = ['transcribing', 'analyzing', 'matching'].indexOf(s)
              const curIdx = ['transcribing', 'analyzing', 'matching', 'followup'].indexOf(procStep)
              const done = idx < curIdx
              const active = s === procStep
              return (
                <div key={s} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: done ? 'var(--blue-600)' : active ? 'var(--blue-400)' : 'var(--bg-soft)',
                  transition: 'background 300ms ease',
                }} />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

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

const iconBtn: React.CSSProperties = {
  padding: 6, borderRadius: 8,
  background: 'transparent', border: 0, cursor: 'pointer',
  color: 'var(--ink-3)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
