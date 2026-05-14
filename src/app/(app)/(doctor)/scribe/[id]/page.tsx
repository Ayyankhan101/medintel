'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, Mic, Sparkles, CheckCircle2, ShieldAlert, Save,
  Stethoscope, ArrowLeft,
} from 'lucide-react'

interface Note {
  id:         string
  appointmentId: string
  transcript: string
  subjective: string
  objective:  string
  assessment: string
  plan:       string
  icdHints:   string[]
  language:   string
  modelUsed:  string | null
  approvedAt: string | null
  approvedBy: string | null
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [note,    setNote]    = useState<Note | null>(null)
  const [draft,   setDraft]   = useState<Partial<Note>>({})
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<'gen' | 'save' | 'approve' | null>(null)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/consultation/${id}/scribe`)
    if (r.ok) {
      const n: Note = await r.json()
      setNote(n)
      setDraft(n)
      setTranscript(n.transcript)
    } else if (r.status === 404) {
      setNote(null)
    } else {
      setErr((await r.json().catch(() => ({}))).error ?? 'Load failed')
    }
    setLoading(false)
  }

  async function generate() {
    if (transcript.trim().length < 10) { setErr('Transcript must be at least 10 chars'); return }
    setWorking('gen'); setErr(null)
    const r = await fetch(`/api/consultation/${id}/scribe`, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ transcript }),
    })
    const d = await r.json().catch(() => ({}))
    setWorking(null)
    if (!r.ok) { setErr(d.error ?? 'Generation failed'); return }
    setNote(d.note); setDraft(d.note)
    if (d.usedFallback) setErr('AI fell back to a stub — review and rewrite manually.')
  }

  async function save(approve = false) {
    setWorking(approve ? 'approve' : 'save'); setErr(null)
    const r = await fetch(`/api/consultation/${id}/scribe`, {
      method:  'PATCH',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        subjective: draft.subjective, objective: draft.objective,
        assessment: draft.assessment, plan: draft.plan,
        icdHints:   draft.icdHints,
        ...(approve ? { approve: true } : {}),
      }),
    })
    const d = await r.json().catch(() => ({}))
    setWorking(null)
    if (!r.ok) { setErr(d.error ?? 'Save failed'); return }
    setNote(d); setDraft(d)
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 flex items-center gap-2 text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading scribe…
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/doctor/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-blue-600" /> Clinical scribe
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          AI assists — you stay in charge. Nothing enters the patient's record until you approve.
        </p>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Mic className="w-4 h-4 text-slate-400" /> Transcript
        </label>
        <textarea
          rows={8}
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste the consultation transcript here, or upload audio from the video room (coming soon)."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm font-mono"
        />
        <button
          onClick={generate}
          disabled={working === 'gen'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {working === 'gen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {note ? 'Re-generate SOAP' : 'Generate SOAP'}
        </button>
      </div>

      {note && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <Section label="Subjective"  value={draft.subjective ?? ''}  onChange={v => setDraft(d => ({ ...d, subjective: v }))} />
          <Section label="Objective"   value={draft.objective ?? ''}   onChange={v => setDraft(d => ({ ...d, objective:  v }))} />
          <Section label="Assessment"  value={draft.assessment ?? ''}  onChange={v => setDraft(d => ({ ...d, assessment: v }))} />
          <Section label="Plan"        value={draft.plan ?? ''}        onChange={v => setDraft(d => ({ ...d, plan:       v }))} />

          {(draft.icdHints ?? []).length > 0 && (
            <div className="text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ICD hints (verify before billing)</p>
              <div className="flex flex-wrap gap-1.5">
                {(draft.icdHints ?? []).map((h, i) => (
                  <span key={i} className="inline-block px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{h}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              Model: <code className="font-mono">{note.modelUsed ?? '—'}</code> · Language: {note.language}
              {note.approvedAt && (
                <span className="ml-3 inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved {new Date(note.approvedAt).toLocaleString('en-PK')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => save(false)}
                disabled={working !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {working === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save draft
              </button>
              <button
                onClick={() => save(true)}
                disabled={working !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {working === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve & sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm"
      />
    </div>
  )
}
