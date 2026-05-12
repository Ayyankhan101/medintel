'use client'
import { useState, useRef, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

interface Props {
  onRecordingComplete: (blob: Blob, filename: string) => void
}

type RecordingState = 'idle' | 'recording' | 'processing'

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const [state, setState]     = useState<RecordingState>('idle')
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef      = useRef<MediaRecorder | null>(null)
  const chunksRef             = useRef<Blob[]>([])
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    const stream        = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = mediaRecorder
    chunksRef.current        = []

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob     = new Blob(chunksRef.current, { type: 'audio/webm' })
      const filename = `recording-${Date.now()}.webm`
      stream.getTracks().forEach(t => t.stop())
      setState('processing')
      onRecordingComplete(blob, filename)
    }

    mediaRecorder.start(1000)
    setState('recording')
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="text-gray-500 text-center max-w-xs">
        Press and speak — describe your symptoms in your own words (Urdu or English)
      </p>

      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="w-36 h-36 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg flex items-center justify-center"
          aria-label="Start recording"
        >
          <Mic className="w-16 h-16 text-white" />
        </button>
      )}

      {state === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={stopRecording}
            className="w-36 h-36 rounded-full bg-red-600 animate-pulse shadow-xl flex items-center justify-center"
            aria-label="Stop recording"
          >
            <Square className="w-12 h-12 text-white fill-white" />
          </button>
          <span className="text-2xl font-mono text-red-600 font-bold">{formatTime(seconds)}</span>
          <p className="text-sm text-gray-400">Tap to stop</p>
        </div>
      )}

      {state === 'processing' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-36 h-36 rounded-full bg-blue-100 flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          </div>
          <p className="text-blue-600 font-medium">Analyzing your symptoms...</p>
        </div>
      )}
    </div>
  )
}
