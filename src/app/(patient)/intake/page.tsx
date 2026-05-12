'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VoiceRecorder } from '@/components/voice/VoiceRecorder'
import { SymptomSummary } from '@/components/intake/SymptomSummary'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { TriageResult } from '@/types'

type IntakeMode = 'choose' | 'voice' | 'text'

interface IntakeResult extends TriageResult {
  transcript: string
  summary: string
  appointmentId: string
}

async function createDraftAppointment(): Promise<string> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create appointment')
  return data.appointmentId
}

export default function IntakePage() {
  const router    = useRouter()
  const [mode, setMode]         = useState<IntakeMode>('choose')
  const [textInput, setTextInput] = useState('')
  const [result, setResult]     = useState<IntakeResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleVoiceComplete(blob: Blob, filename: string) {
    setLoading(true)
    setError(null)
    try {
      const appointmentId = await createDraftAppointment()

      const presignRes = await fetch('/api/voice/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType: 'audio/webm' }),
      })
      const { uploadUrl, s3Key } = await presignRes.json()

      await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'audio/webm' } })

      const transcribeRes = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key, appointmentId }),
      })
      const data = await transcribeRes.json()
      if (!transcribeRes.ok) throw new Error(data.error ?? 'Transcription failed')
      setResult({ ...data, appointmentId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Processing failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTextSubmit() {
    if (!textInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const appointmentId = await createDraftAppointment()

      const res = await fetch('/api/voice/transcribe-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setResult({ ...data, appointmentId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">Describe Your Symptoms</h1>

      {!result && mode === 'choose' && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('voice')}
            className="p-8 border-2 border-dashed border-red-300 rounded-xl hover:bg-red-50 text-center space-y-2 transition-colors"
          >
            <div className="text-4xl">🎙️</div>
            <div className="font-medium">Speak</div>
            <div className="text-sm text-gray-500">Urdu or English voice message</div>
          </button>
          <button
            onClick={() => setMode('text')}
            className="p-8 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 text-center space-y-2 transition-colors"
          >
            <div className="text-4xl">⌨️</div>
            <div className="font-medium">Type</div>
            <div className="text-sm text-gray-500">Write your symptoms</div>
          </button>
        </div>
      )}

      {!result && mode === 'voice' && (
        <div>
          <button onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
            ← Back
          </button>
          <VoiceRecorder onRecordingComplete={handleVoiceComplete} />
        </div>
      )}

      {!result && mode === 'text' && (
        <div className="space-y-3">
          <button onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <Textarea
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Describe your symptoms... e.g. 'I have had a severe headache for 2 days with nausea'"
            className="min-h-[150px]"
          />
          <Button
            onClick={handleTextSubmit}
            disabled={loading || !textInput.trim()}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze Symptoms'}
          </Button>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <SymptomSummary {...result} />
          <Button
            className="w-full"
            onClick={() =>
              router.push(`/doctors?dept=${encodeURIComponent(result.department)}&appointmentId=${result.appointmentId}`)
            }
          >
            Find a {result.department} Doctor →
          </Button>
          <Button variant="outline" className="w-full" onClick={() => { setResult(null); setMode('choose') }}>
            Start Over
          </Button>
        </div>
      )}
    </div>
  )
}
