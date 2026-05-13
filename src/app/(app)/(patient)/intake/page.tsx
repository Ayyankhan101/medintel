'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { SymptomSummary } from '@/components/intake/SymptomSummary'
import { UploadDocs } from '@/components/intake/UploadDocs'
import { NearbyHospitalsDialog } from '@/components/resources/NearbyHospitalsDialog'
import { Mic, Keyboard, ChevronLeft, Loader2, ArrowRight } from 'lucide-react'
import type { TriageResult } from '@/types'

type IntakeMode = 'choose' | 'voice' | 'text'
interface IntakeResult extends TriageResult { triageId: string; transcript: string; summary: string }

export default function IntakePage() {
  const router = useRouter()
  const [mode,      setMode]      = useState<IntakeMode>('choose')
  const [textInput, setTextInput] = useState('')
  const [result,    setResult]    = useState<IntakeResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleVoiceComplete(blob: Blob, filename: string) {
    setLoading(true); setError(null)
    try {
      const form = new FormData()
      form.append('audio', blob, filename)
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput }),
      })
      const raw  = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
      setResult(data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed') }
    finally { setLoading(false) }
  }

  if (result) {
    const params = new URLSearchParams({
      triageId: result.triageId,
      dept:     result.department,
      severity: result.severityLevel,
      score:    String(result.severityScore),
    })
    return (
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        <SymptomSummary {...result} />
        <UploadDocs
          triageId={result.triageId}
          onRefined={updated => setResult({ ...result, ...updated })}
        />
        <button
          onClick={() => router.push(`/doctors?${params.toString()}`)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Find a {result.department} Doctor <ArrowRight className="w-4 h-4" />
        </button>
        <NearbyHospitalsDialog autoOpen />
        <button
          onClick={() => { setResult(null); setMode('choose') }}
          className="w-full py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-xl transition-colors text-sm"
        >
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">How are you feeling?</h1>
        <p className="text-slate-500 mt-1.5">Describe your symptoms — we'll find the right doctor for you</p>
      </div>

      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setMode('voice')} className="group flex flex-col items-center gap-4 p-8 bg-white border-2 border-slate-200 hover:border-red-300 hover:bg-red-50/50 rounded-2xl transition-all">
            <div className="w-16 h-16 rounded-2xl bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
              <Mic className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">Speak</p>
              <p className="text-xs text-slate-400 mt-0.5">Urdu یا English</p>
            </div>
          </button>
          <button onClick={() => setMode('text')} className="group flex flex-col items-center gap-4 p-8 bg-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-2xl transition-all">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
              <Keyboard className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">Type</p>
              <p className="text-xs text-slate-400 mt-0.5">Write symptoms</p>
            </div>
          </button>
        </div>
      )}

      {mode === 'voice' && (
        <div className="bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2 px-5 pt-5">
            <button onClick={() => setMode('choose')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-600">Voice Recording</span>
          </div>
          <VoiceRecorder onRecordingComplete={handleVoiceComplete} />
        </div>
      )}

      {mode === 'text' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setMode('choose')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-slate-600">Describe Your Symptoms</span>
          </div>
          <textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="e.g. I've had a severe headache for 2 days with nausea and sensitivity to light…"
            className="w-full min-h-[160px] px-4 py-3 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
          />
          <button
            onClick={handleTextSubmit}
            disabled={loading || !textInput.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <>Analyze Symptoms <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
