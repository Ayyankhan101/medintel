'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, Mic, Sparkles, CheckCircle2, ShieldAlert, Save,
  Stethoscope, ArrowLeft,
} from 'lucide-react'
import { Btn } from '@/components/design/Btn'

interface Note {
  id:            string
  appointmentId: string
  transcript:    string
  subjective:    string
  objective:     string
  assessment:    string
  plan:          string
  icdHints:      string[]
  language:      string
  modelUsed:     string | null
  approvedAt:    string | null
  approvedBy:    string | null
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [note,       setNote]       = useState<Note | null>(null)
  const [draft,      setDraft]      = useState<Partial<Note>>({})
  const [transcript, setTranscript] = useState('')
  const [loading,    setLoading]    = useState(true)
  const [working,    setWorking]    = useState<'gen' | 'save' | 'approve' | null>(null)
  const [err,        setErr]        = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/consultation/${id}/scribe`)
    if (r.ok) {
      const n: Note = await r.json()
      setNote(n); setDraft(n); setTranscript(n.transcript)
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
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /> Loading scribe…
    </div>
  )

  return (
    <div style={{
      maxWidth: 920, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <div>
        <Link href="/doctor/dashboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 style={{
          margin: '12px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)',
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}>
          <Stethoscope size={22} style={{ color: 'var(--blue-700)' }} /> Clinical scribe
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
          AI assists — you stay in charge. Nothing enters the patient&apos;s record until you approve.
        </p>
      </div>

      {err && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.30)',
          borderRadius: 12, padding: '12px 14px',
          fontSize: 13, color: '#a16207',
        }}>
          <ShieldAlert size={14} style={{ flex: 'none', marginTop: 2 }} /> {err}
        </div>
      )}

      <section style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, color: 'var(--ink)',
        }}>
          <Mic size={14} style={{ color: 'var(--ink-3)' }} /> Transcript
        </label>
        <textarea
          rows={8}
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste the consultation transcript here, or upload audio from the video room (coming soon)."
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-soft)', color: 'var(--ink)',
            fontSize: 13, lineHeight: 1.5,
            fontFamily: 'var(--font-mono)', resize: 'vertical',
            outline: 'none',
          }}
          onFocus={e => { e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,.14)'; e.target.style.borderColor = 'var(--blue-600)' }}
          onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = 'var(--border)' }}
        />
        <Btn kind="primary" onClick={generate} disabled={working === 'gen'}
             leading={working === 'gen' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}>
          {note ? 'Re-generate SOAP' : 'Generate SOAP'}
        </Btn>
      </section>

      {note && (
        <section style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <SoapField label="Subjective" value={draft.subjective ?? ''} onChange={v => setDraft(d => ({ ...d, subjective: v }))} />
          <SoapField label="Objective"  value={draft.objective ?? ''}  onChange={v => setDraft(d => ({ ...d, objective: v }))} />
          <SoapField label="Assessment" value={draft.assessment ?? ''} onChange={v => setDraft(d => ({ ...d, assessment: v }))} />
          <SoapField label="Plan"       value={draft.plan ?? ''}       onChange={v => setDraft(d => ({ ...d, plan: v }))} />

          {(draft.icdHints ?? []).length > 0 && (
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>
                ICD hints (verify before billing)
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(draft.icdHints ?? []).map((h, i) => (
                  <span key={i} className="mono" style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: 'var(--bg-soft)', color: 'var(--ink-2)',
                    border: '1px solid var(--border)',
                    fontSize: 11,
                  }}>{h}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 12, borderTop: '1px solid var(--border)',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
              Model: <code className="mono">{note.modelUsed ?? '—'}</code> · Language: {note.language}
              {note.approvedAt && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 10, color: '#047857' }}>
                  <CheckCircle2 size={13} /> Approved {new Date(note.approvedAt).toLocaleString('en-PK')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind="secondary" onClick={() => save(false)} disabled={working !== null}
                   leading={working === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}>
                Save draft
              </Btn>
              <Btn kind="primary" onClick={() => save(true)} disabled={working !== null}
                   style={{ background: 'var(--emerald-500)', boxShadow: '0 4px 12px -4px rgba(16,185,129,.55)' }}
                   leading={working === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}>
                Approve &amp; sign
              </Btn>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function SoapField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{
        fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
        letterSpacing: '.06em', textTransform: 'uppercase',
      }}>{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          marginTop: 6, width: '100%', padding: '10px 12px',
          borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--bg-soft)', color: 'var(--ink)',
          fontSize: 13, lineHeight: 1.5, resize: 'vertical',
          outline: 'none', fontFamily: 'var(--font-ui)',
        }}
        onFocus={e => { e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,.14)'; e.target.style.borderColor = 'var(--blue-600)' }}
        onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}
