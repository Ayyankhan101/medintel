'use client'
import { useRef, useState, useEffect } from 'react'
import { Paperclip, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/client'

export interface KeyFinding {
  metric:         string
  value:          string
  interpretation: string
  isAbnormal:     boolean
}
interface Props {
  triageId: string
  onRefined: (updated: {
    triageId:               string
    transcript:             string
    summary:                string
    department:             string
    severityScore:          number
    severityLevel:          'ROUTINE' | 'URGENT' | 'CRITICAL'
    extractedFindings:      string
    keyFindings?:           KeyFinding[]
    suggestedInterventions?: string[]
    documentTypes?:         string[]
    isEmergency:            boolean
  }) => void
}

export function UploadDocs({ triageId, onRefined }: Props) {
  const { T } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open,    setOpen]    = useState(false)
  const [files,   setFiles]   = useState<File[]>([])
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    return () => previews.forEach(p => URL.revokeObjectURL(p))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    previews.forEach(p => URL.revokeObjectURL(p))
    const list = Array.from(e.target.files ?? []).slice(0, 3)
    setFiles(list)
    setPreviews(list.map(f => URL.createObjectURL(f)))
    setError(null)
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i])
    setFiles(f => f.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
    if (inputRef.current) inputRef.current.value = ''
  }

  async function onUpload() {
    if (files.length === 0) return
    setBusy(true); setError(null)
    try {
      const form = new FormData()
      files.forEach(f => form.append('docs', f))
      const res = await fetch(`/api/triage/${triageId}/refine`, { method: 'POST', body: form })
      const raw = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? T('uploadDocs.uploadFailed'))
      onRefined(data)
      previews.forEach(p => URL.revokeObjectURL(p))
      setFiles([])
      setPreviews([])
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : T('uploadDocs.uploadFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden transition-shadow duration-200">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-blue-600" />
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {T('uploadDocs.prompt')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {T('uploadDocs.reanalyze')}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3"
          style={{ animation: 'mi-fade-up 200ms var(--ease-out-quart) both' }}>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {T('uploadDocs.hint')}
          </p>

          <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-800/50">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onSelect}
              disabled={busy}
              className="sr-only"
            />
            <Paperclip className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {files.length > 0 ? T('uploadDocs.filesSelected').replace('{n}', String(files.length)) : T('uploadDocs.tapBrowse')}
            </span>
          </label>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <img src={url} alt={files[i]?.name ?? ''} className="w-full h-20 object-cover" />
                  <button onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={T('uploadDocs.removeFile').replace('{name}', files[i]?.name ?? '')}>
                    <X className="w-3 h-3" />
                  </button>
                  <div className="px-1.5 py-1">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{files[i]?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            onClick={onUpload}
            disabled={busy || files.length === 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            {busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {T('uploadDocs.reading')}</>
              : <><CheckCircle2 className="w-4 h-4" /> {T('uploadDocs.reanalyzeBtn')}</>}
          </button>
        </div>
      )}
    </div>
  )
}
