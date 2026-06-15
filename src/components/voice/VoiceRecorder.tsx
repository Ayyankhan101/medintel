'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2, AlertCircle, Play, RotateCcw, Check } from 'lucide-react'

interface Props { onRecordingComplete: (blob: Blob, filename: string, language: string) => void }

const LANGUAGES = [
  { code: 'ur', label: 'اردو',  english: 'Urdu' },
  { code: 'ps', label: 'پښتو',   english: 'Pashto' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ',   english: 'Punjabi' },
  { code: 'sd', label: 'سنڌي',   english: 'Sindhi' },
  { code: 'en', label: 'English', english: 'English' },
]

type State = 'idle' | 'recording' | 'reviewing' | 'processing' | 'error'
type ProcessingStep = 'transcribing' | 'analyzing' | 'matching'
const MAX_RECORDING_S = 120
const WARN_AT_S = 30

const LANG_TIPS: Record<string, string> = {
  ur: 'اپنی علامات قدرتی طور پر بیان کریں — کب سے ہیں، کتنی شدید ہیں، اور کوئی خاص تفصیل',
  ps: 'خپلې نښې په طبیعي ډول بیان کړئ — له کله راهیسې، څومره شدیدې دي، او کوم مشخص معلومات',
  pa: 'ਆਪਣੇ ਲੱਛਣਾਂ ਨੂੰ ਕੁਦਰਤੀ ਤੌਰ \'ਤੇ ਦੱਸੋ — ਕਦੋਂ ਤੋਂ ਹਨ, ਕਿੰਨੇ ਗੰਭੀਰ ਹਨ, ਅਤੇ ਕੋਈ ਖਾਸ ਵੇਰਵਾ',
  sd: 'پنھنجن علامتن کي قدرتي طور بيان ڪريو — ڪڏھن کان آھن، ڪيترو سخت آھن، ۽ ڪو خاص تفصيل',
  en: 'Describe your symptoms naturally — how long, how severe, and any specific details',
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const t of [
    'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg',
  ]) {
    try { if (MediaRecorder.isTypeSupported(t)) return t } catch {}
  }
  return undefined
}

function extFromMime(mime: string | undefined): string {
  if (!mime) return 'webm'
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const [state,       setState]    = useState<State>('idle')
  const [seconds,     setSeconds]  = useState(0)
  const [level,       setLevel]    = useState(0)
  const [errorMsg,    setErrorMsg] = useState<string | null>(null)
  const [language,    setLanguage] = useState('ur')
  const [procStep,    setProcStep] = useState<ProcessingStep>('transcribing')
  const [isPlaying,   setIsPlaying] = useState(false)

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedExt,  setRecordedExt]  = useState('webm')

  const recorderRef   = useRef<MediaRecorder | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef   = useRef<AudioContext | null>(null)
  const analyserRef   = useRef<AnalyserNode | null>(null)
  const rafRef        = useRef<number | null>(null)
  const secondsRef    = useRef(0)
  const audioRef      = useRef<HTMLAudioElement | null>(null)
  const procTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    setLevel(0)
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
      procTimersRef.current.forEach(clearTimeout)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [cleanup])

  const startRecording = useCallback(async () => {
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onerror = () => { cleanup(); setState('error'); setErrorMsg('Recording failed. Please try again.') }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        const ext = extFromMime(recorder.mimeType || mimeType)
        cleanup()
        if (blob.size === 0) {
          setState('error'); setErrorMsg('No audio captured. Check that your microphone is working.')
          return
        }
        setRecordedBlob(blob); setRecordedExt(ext)
        setSeconds(secondsRef.current)
        setState('reviewing')
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const a = ctx.createAnalyser()
      a.fftSize = 256
      src.connect(a)
      analyserRef.current = a

      const buf = new Uint8Array(a.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()

      secondsRef.current = 0
      setSeconds(0)
      recorder.start(250)
      setState('recording')
      timerRef.current = setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
        if (secondsRef.current >= MAX_RECORDING_S) {
          try { recorderRef.current?.stop() } catch {}
        }
      }, 1000)
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
  }, [cleanup])

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.stop() } catch {}
  }, [])

  function handleReRecord() {
    setRecordedBlob(null); setRecordedExt('webm'); setIsPlaying(false); setSeconds(0); secondsRef.current = 0
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null }
    setState('idle')
  }

  function handleConfirm() {
    if (!recordedBlob) return
    setState('processing')
    setProcStep('transcribing')
    const t1 = setTimeout(() => setProcStep('analyzing'), 1500)
    const t2 = setTimeout(() => setProcStep('matching'), 3500)
    procTimersRef.current = [t1, t2]
    setTimeout(() => {
      onRecordingComplete(recordedBlob, `recording-${Date.now()}.${recordedExt}`, language)
    }, 50)
  }

  function handlePlayback() {
    if (!recordedBlob || isPlaying) return
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.onended = () => setIsPlaying(false)
    }
    audioRef.current.src = URL.createObjectURL(recordedBlob)
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const ringScale = 1 + level * 0.4
  const currentLang = LANGUAGES.find(l => l.code === language)

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* ── IDLE + ERROR ── */}
      {(state === 'idle' || state === 'error') && (
        <div className="flex flex-col items-center gap-5" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <div className="text-center space-y-1 max-w-xs">
            <p className="text-slate-700 dark:text-slate-200 font-medium text-base">
              Tap the mic and describe your symptoms
            </p>
            <p className="text-sm text-slate-400">Urdu یا English — we understand both</p>
          </div>
          <button onClick={startRecording}
            className="relative w-40 h-40 rounded-full group focus:outline-none focus:ring-4 focus:ring-red-200"
            aria-label="Start recording">
            <span className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30 group-hover:scale-110 transition-transform duration-300" />
            <span className="absolute inset-3 rounded-full bg-red-500 group-hover:bg-red-600 transition-colors shadow-lg shadow-red-200 dark:shadow-red-900/40 flex items-center justify-center">
              <Mic className="w-16 h-16 text-white" />
            </span>
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1.5" role="radiogroup" aria-label="Select language">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLanguage(l.code)} role="radio" aria-checked={language === l.code}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  language === l.code
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}>
                <span className="font-semibold mr-1">{l.label}</span>
                <span className="text-[10px] opacity-70">({l.english})</span>
              </button>
            ))}
          </div>
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 max-w-sm">
            <p className="text-xs text-slate-400 leading-relaxed text-center">{LANG_TIPS[language]}</p>
          </div>
        </div>
      )}

      {/* ── RECORDING ── */}
      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <div className="text-center space-y-1">
            <p className="text-slate-700 dark:text-slate-200 font-medium">Listening — tap to stop</p>
            {currentLang && (
              <p className="text-xs text-slate-400">{currentLang.label} ({currentLang.english})</p>
            )}
          </div>
          <button onClick={stopRecording}
            className="relative w-40 h-40 rounded-full focus:outline-none focus:ring-4 focus:ring-red-300"
            aria-label="Stop recording">
            <span className="absolute inset-0 rounded-full bg-red-300/60 dark:bg-red-700/50 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-red-400/80 dark:bg-red-600/70 transition-transform duration-100 ease-out"
              style={{ transform: `scale(${ringScale})` }} />
            <span className="absolute inset-4 rounded-full bg-red-600 shadow-xl shadow-red-400/50 dark:shadow-red-900/60 flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
              <Square className="w-12 h-12 text-white fill-white" />
            </span>
            <span className="absolute top-1 right-1 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              REC
            </span>
          </button>
          <div className="flex items-end gap-1 h-8" aria-hidden>
            {Array.from({ length: 16 }).map((_, i) => {
              const d = Math.abs(i - 7.5) / 8
              return <span key={i} className="w-1 rounded-full bg-red-500 dark:bg-red-400 transition-all duration-100" style={{ height: `${Math.max(0.15, level * (1 - d * 0.6)) * 100}%` }} />
            })}
          </div>
          <div className="text-center">
            <span className={`text-3xl font-mono font-bold tabular-nums ${seconds >= MAX_RECORDING_S - 10 ? 'text-red-500 animate-pulse' : seconds > WARN_AT_S ? 'text-amber-500' : 'text-red-600'}`}>
              {fmt(seconds)}
            </span>
            {seconds > WARN_AT_S && seconds < MAX_RECORDING_S - 10 && (
              <p className="text-xs text-amber-500 mt-1 font-medium">Will auto-stop at {fmt(MAX_RECORDING_S)}</p>
            )}
            {seconds >= MAX_RECORDING_S - 10 && (
              <p className="text-xs text-red-500 mt-1 font-medium">Stopping…</p>
            )}
          </div>
        </div>
      )}

      {/* ── REVIEWING ── */}
      {state === 'reviewing' && recordedBlob && (
        <div className="flex flex-col items-center gap-5" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-slate-700 dark:text-slate-200 font-medium">Recording complete</p>
            <p className="text-xs text-slate-400">Duration: {fmt(seconds)}</p>
          </div>
          <button onClick={handlePlayback}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            aria-label={isPlaying ? 'Playing' : 'Play recording'}>
            <span className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-emerald-500' : 'bg-blue-600'}`}>
              {isPlaying
                ? <span className="flex items-end gap-0.5 h-4"><span className="w-0.5 bg-white rounded-full animate-bounce" style={{animationDelay:'0ms',height:'8px'}} /><span className="w-0.5 bg-white rounded-full animate-bounce" style={{animationDelay:'150ms',height:'12px'}} /><span className="w-0.5 bg-white rounded-full animate-bounce" style={{animationDelay:'300ms',height:'6px'}} /></span>
                : <Play className="w-5 h-5 text-white fill-white" />
              }
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isPlaying ? 'Playing…' : 'Play back recording'}
            </span>
          </button>
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={handleReRecord}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
              <RotateCcw className="w-4 h-4" /> Re-record
            </button>
            <button onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-medium shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
              <Mic className="w-4 h-4" /> Send for analysis
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center max-w-xs">Your audio won&apos;t be stored — only the transcript is saved.</p>
        </div>
      )}

      {/* ── PROCESSING — 3-step animation ── */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-6" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 flex items-center justify-center">
            <Loader2 className="w-14 h-14 text-blue-500 animate-spin" />
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {[
              { key: 'transcribing' as const, label: 'Transcribing your audio…' },
              { key: 'analyzing' as const,    label: 'Analyzing your symptoms…' },
              { key: 'matching' as const,     label: 'Finding the best doctors…' },
            ].map(step => {
              const stepIdx = ['transcribing', 'analyzing', 'matching'].indexOf(step.key)
              const curIdx  = ['transcribing', 'analyzing', 'matching'].indexOf(procStep)
              const isDone  = stepIdx < curIdx
              const isCurrent = step.key === procStep
              return (
                <div key={step.key} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 shadow-sm'
                    : isDone
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-300 dark:text-slate-600'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}>
                    {isDone ? '✓' : stepIdx + 1}
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                  {isCurrent && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin ml-auto" />}
                  {isDone && <span className="text-emerald-500 text-xs ml-auto">Done</span>}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 text-center max-w-xs">This usually takes 10–15 seconds</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {state === 'error' && errorMsg && (
        <div className="flex flex-col items-center gap-5" style={{ animation: 'mi-fade-up 320ms var(--ease-out-quart) both' }}>
          <div className="flex items-start gap-2 max-w-sm text-sm bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
          <button onClick={() => { setState('idle'); setErrorMsg(null) }}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors underline underline-offset-2">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
