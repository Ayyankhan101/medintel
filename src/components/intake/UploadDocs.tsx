'use client'
import { useRef, useState } from 'react'
import { Paperclip, Loader2, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [files,   setFiles]   = useState<File[]>([])
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []).slice(0, 3)
    setFiles(list)
    setError(null)
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
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onRefined(data)
      setFiles([])
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-blue-600" />
          Have lab reports or a prescription? Upload them.
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          The AI will re-read the findings and update the severity. Images only (JPG/PNG), up to 3 files.
        </p>
      </div>

      <label className="block">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onSelect}
          disabled={busy}
          className="block w-full text-sm text-slate-600 dark:text-slate-300
                     file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                     file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
        />
      </label>

      {files.length > 0 && (
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2">
              <FileImage className="w-3 h-3 text-slate-400" />
              <span className="truncate">{f.name}</span>
              <span className="text-slate-400">· {(f.size / 1024).toFixed(0)} KB</span>
            </li>
          ))}
        </ul>
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
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm"
      >
        {busy
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading documents…</>
          : <><CheckCircle2 className="w-4 h-4" /> Re-analyse with these documents</>}
      </button>
    </div>
  )
}
