'use client'
import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

interface Props { onRecordingComplete: (blob: Blob, filename: string) => void }
type State = 'idle' | 'recording' | 'processing'

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const [state,   setState]   = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)
  const recorderRef           = useRef<MediaRecorder | null>(null)
  const chunksRef             = useRef<Blob[]>([])
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    recorderRef.current = recorder
    chunksRef.current   = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      setState('processing')
      onRecordingComplete(new Blob(chunksRef.current, { type: 'audio/webm' }), `recording-${Date.now()}.webm`)
    }
    recorder.start(1000)
    setState('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="text-center space-y-1 max-w-xs">
        <p className="text-slate-700 font-medium">Tap the mic and speak freely</p>
        <p className="text-sm text-slate-400">Urdu یا English میں بولیں — ہم سمجھتے ہیں</p>
      </div>

      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="relative w-36 h-36 rounded-full group"
          aria-label="Start recording"
        >
          <span className="absolute inset-0 rounded-full bg-red-100 group-hover:scale-110 transition-transform duration-300" />
          <span className="absolute inset-3 rounded-full bg-red-500 group-hover:bg-red-600 transition-colors shadow-lg shadow-red-200 flex items-center justify-center">
            <Mic className="w-14 h-14 text-white" />
          </span>
        </button>
      )}

      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={stopRecording}
            className="relative w-36 h-36 rounded-full"
            aria-label="Stop recording"
          >
            <span className="absolute inset-0 rounded-full bg-red-200 animate-ping opacity-60" />
            <span className="absolute inset-0 rounded-full bg-red-100" />
            <span className="absolute inset-3 rounded-full bg-red-600 shadow-xl shadow-red-300 flex items-center justify-center">
              <Square className="w-10 h-10 text-white fill-white" />
            </span>
          </button>
          <div className="text-center">
            <span className="text-3xl font-mono font-bold text-red-600 tabular-nums">{fmt(seconds)}</span>
            <p className="text-xs text-slate-400 mt-1">Tap to stop</p>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-36 h-36 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
            <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-blue-700">Analyzing your symptoms…</p>
            <p className="text-xs text-slate-400 mt-0.5">Transcribing with AI — usually under 10 seconds</p>
          </div>
        </div>
      )}
    </div>
  )
}
