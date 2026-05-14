'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Upload, ImageIcon, Loader2, ShieldAlert, Stethoscope, AlertTriangle,
} from 'lucide-react'

interface Findings {
  imageType:          string
  observations:       string[]
  redFlags:           string[]
  urgencyHint:        'ROUTINE' | 'URGENT' | 'CRITICAL'
  suggestedSpecialty: string
  caveat:             string
}

export default function ImagingPage() {
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [findings, setFindings] = useState<Findings | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState<string | null>(null)
  const [fallback, setFallback] = useState(false)

  function onPick(f: File | null) {
    setFile(f); setFindings(null); setErr(null); setFallback(false)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function analyse() {
    if (!file) return
    setLoading(true); setErr(null)
    const form = new FormData()
    form.append('image', file)
    const r = await fetch('/api/imaging/analyze', { method: 'POST', body: form })
    const d = await r.json().catch(() => ({}))
    setLoading(false)
    if (!r.ok) { setErr(d.error ?? 'Analysis failed'); return }
    setFindings(d.findings)
    setFallback(!!d.usedFallback)
  }

  const urgencyColor = findings?.urgencyHint === 'CRITICAL' ? 'red'
                     : findings?.urgencyHint === 'URGENT'   ? 'amber'
                     : 'blue'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-600" /> Image triage
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload an X-ray, skin photo, or eye photo. Our AI describes what it sees — it does <strong>not</strong> diagnose.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 px-4 py-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <Upload className="w-6 h-6 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {file ? file.name : 'Click to select an image'}
          </p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP, or HEIC · max 8 MB</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={e => onPick(e.target.files?.[0] ?? null)}
          />
        </label>

        {preview && (
          <img src={preview} alt="" className="max-h-64 mx-auto rounded-xl border border-slate-200 dark:border-slate-800" />
        )}

        <button
          disabled={!file || loading}
          onClick={analyse}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Analyse image
        </button>

        {err && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
          </div>
        )}
      </div>

      {findings && (
        <div className={`rounded-2xl border border-${urgencyColor}-200 bg-${urgencyColor}-50 dark:bg-${urgencyColor}-950/30 p-5 space-y-4`}>
          {fallback && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5" /> AI confidence was low — please re-upload a clearer image or describe your concern in /intake.
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Image type</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">{findings.imageType}</span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Observations</p>
            <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
              {findings.observations.map((o, i) => <li key={i}>• {o}</li>)}
            </ul>
          </div>

          {findings.redFlags.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-red-700 mb-1">Red flags</p>
              <ul className="space-y-1 text-sm text-red-800">
                {findings.redFlags.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs">
              <p className="text-slate-500">Urgency</p>
              <p className={`font-bold text-${urgencyColor}-700`}>{findings.urgencyHint}</p>
            </div>
            <div className="text-xs text-right">
              <p className="text-slate-500">Suggested specialty</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1 justify-end">
                <Stethoscope className="w-3.5 h-3.5" /> {findings.suggestedSpecialty}
              </p>
            </div>
          </div>

          <p className="text-xs italic text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">{findings.caveat}</p>

          <Link
            href={`/doctors?dept=${encodeURIComponent(findings.suggestedSpecialty)}`}
            className="block w-full text-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Find a {findings.suggestedSpecialty} →
          </Link>
        </div>
      )}
    </div>
  )
}
