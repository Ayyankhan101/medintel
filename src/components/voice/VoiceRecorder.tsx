'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react'

interface Props { onRecordingComplete: (blob: Blob, filename: string, language: string) => void }

const LANGUAGES = [
  { code: 'ur', label: 'اردو',  english: 'Urdu' },
  { code: 'ps', label: 'پښتو',   english: 'Pashto' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ',   english: 'Punjabi' },
  { code: 'sd', label: 'سنڌي',   english: 'Sindhi' },
  { code: 'en', label: 'English', english: 'English' },
]
type State = 'idle' | 'recording' | 'processing' | 'error'

// Pick a mime type the browser actually supports.
// iOS Safari doesn't support webm — falls back to mp4. Older Android may need plain audio/*.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const t of candidates) {
    try { if (MediaRecorder.isTypeSupported(t)) return t } catch { /* iOS pre-15 */ }
  }
  return undefined // let the browser pick
}

function extFromMime(mime: string | undefined): string {
  if (!mime) return 'webm'
  if (mime.includes('mp4'))  return 'm4a'
  if (mime.includes('ogg'))  return 'ogg'
  return 'webm'
}

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const [state,   setState]   = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)
  const [level,   setLevel]   = useState(0) // 0..1 — live mic loudness
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [language, setLanguage] = useState('ur')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef      = useRef<number | null>(null)
  const mimeRef     = useRef<string | undefined>(undefined)

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (rafRef.current)   { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    setLevel(0)
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRecording = useCallback(async () => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      mimeRef.current = mimeType
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current   = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onerror = () => {
        cleanup()
        setState('error')
        setErrorMsg('Recording failed. Please try again.')
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        cleanup()
        if (blob.size === 0) {
          setState('error')
          setErrorMsg('No audio captured. Check that your microphone is working.')
          return
        }
        setState('processing')
        onRecordingComplete(blob, `recording-${Date.now()}.${extFromMime(recorder.mimeType || mimeType)}`, language)
      }

      // Live audio level for the visualizer.
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = analyser

      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / buf.length)
        setLevel(Math.min(1, rms * 3)) // scale up so quiet talking still moves the bar
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()

      recorder.start(250) // emit chunks every 250 ms
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch (e) {
      cleanup()
      setState('error')
      const name = (e as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg('Microphone permission denied. Allow it in your browser settings and try again.')
      } else if (name === 'NotFoundError') {
        setErrorMsg('No microphone found on this device.')
      } else {
        setErrorMsg('Could not start recording. Please try again.')
      }
    }
  }, [cleanup, onRecordingComplete])

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.stop() } catch { /* already stopped */ }
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Visual scale of the live ring grows with mic level.
  const ringScale = 1 + level * 0.4

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="text-center space-y-1 max-w-xs">
        <p className="text-slate-700 dark:text-slate-200 font-medium">
          {state === 'recording' ? 'Listening — tap to stop' : 'Tap the mic and speak freely'}
        </p>
        <p className="text-sm text-slate-400">Urdu یا English میں بولیں — ہم سمجھتے ہیں</p>
      </div>

      {/* ── Language picker (idle only) ─────────────────────────────────── */}
      {(state === 'idle' || state === 'error') && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                language === l.code
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
              aria-pressed={language === l.code}
            >
              <span className="font-semibold mr-1">{l.label}</span>
              <span className="text-[10px] opacity-70">({l.english})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── IDLE ───────────────────────────────────────────────────────────── */}
      {(state === 'idle' || state === 'error') && (
        <button
          onClick={startRecording}
          className="relative w-40 h-40 rounded-full group focus:outline-none focus:ring-4 focus:ring-red-200"
          aria-label="Start recording"
        >
          <span className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30 group-hover:scale-110 transition-transform duration-300" />
          <span className="absolute inset-3 rounded-full bg-red-500 group-hover:bg-red-600 transition-colors shadow-lg shadow-red-200 dark:shadow-red-900/40 flex items-center justify-center">
            <Mic className="w-16 h-16 text-white" />
          </span>
        </button>
      )}

      {/* ── RECORDING ───────────────────────────────────────────────────────── */}
      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={stopRecording}
            className="relative w-40 h-40 rounded-full focus:outline-none focus:ring-4 focus:ring-red-300"
            aria-label="Stop recording"
          >
            {/* Outermost ping — proves the button is "live" even when silent */}
            <span className="absolute inset-0 rounded-full bg-red-300/60 dark:bg-red-700/50 animate-ping" />
            {/* Voice-reactive ring — scales with mic level */}
            <span
              className="absolute inset-0 rounded-full bg-red-400/80 dark:bg-red-600/70 transition-transform duration-100 ease-out"
              style={{ transform: `scale(${ringScale})` }}
            />
            {/* Solid inner button with stop icon */}
            <span className="absolute inset-4 rounded-full bg-red-600 shadow-xl shadow-red-400/50 dark:shadow-red-900/60 flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
              <Square className="w-12 h-12 text-white fill-white" />
            </span>
            {/* Live red dot — universal "REC" indicator */}
            <span className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              REC
            </span>
          </button>

          {/* Live audio waveform — 16 bars driven by mic level */}
          <div className="flex items-end gap-1 h-8" aria-hidden>
            {Array.from({ length: 16 }).map((_, i) => {
              const distance = Math.abs(i - 7.5) / 8
              const bar = Math.max(0.15, level * (1 - distance * 0.6))
              return (
                <span
                  key={i}
                  className="w-1 rounded-full bg-red-500 dark:bg-red-400 transition-all duration-100"
                  style={{ height: `${bar * 100}%` }}
                />
              )
            })}
          </div>

          <div className="text-center">
            <span className="text-3xl font-mono font-bold text-red-600 tabular-nums">{fmt(seconds)}</span>
            <p className="text-xs text-slate-400 mt-1">Tap the button again when you're done</p>
          </div>
        </div>
      )}

      {/* ── PROCESSING ──────────────────────────────────────────────────────── */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-40 h-40 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-blue-700 dark:text-blue-300">Analyzing your symptoms…</p>
            <p className="text-xs text-slate-400 mt-0.5">Transcribing with AI — usually under 10 seconds</p>
          </div>
        </div>
      )}

      {/* ── ERROR ───────────────────────────────────────────────────────────── */}
      {state === 'error' && errorMsg && (
        <div className="flex items-start gap-2 max-w-sm text-sm bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}
    </div>
  )
}
