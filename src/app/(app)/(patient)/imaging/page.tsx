'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Upload, ImageIcon, Loader2, ShieldAlert, Stethoscope, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { SeverityPill } from '@/components/design/badges'

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

  const tones = {
    CRITICAL: { bg: 'rgba(239,68,68,.06)',  border: 'rgba(239,68,68,.25)',  fg: 'var(--red-600)' },
    URGENT:   { bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)', fg: '#a16207' },
    ROUTINE:  { bg: 'rgba(37,99,235,.05)',  border: 'rgba(37,99,235,.20)',  fg: 'var(--blue-700)' },
  }

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Image triage
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <ImageIcon size={22} style={{ color: 'var(--blue-700)' }} /> AI image review
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Upload an X-ray, skin photo, or eye photo. Our AI describes what it sees — it does <strong>not</strong> diagnose.
        </p>
      </header>

      <div style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', borderRadius: 16,
          border: '2px dashed var(--border-strong)',
          padding: '32px 16px',
          background: 'var(--bg-soft)',
          transition: 'background-color 200ms ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,.05)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)' }}
        >
          <Upload size={26} style={{ color: 'var(--ink-4)', marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>
            {file ? file.name : 'Click to select an image'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-4)' }}>
            JPG, PNG, WebP, or HEIC · max 8 MB
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            style={{ display: 'none' }}
            onChange={e => onPick(e.target.files?.[0] ?? null)}
          />
        </label>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" style={{
            maxHeight: 280, margin: '0 auto',
            borderRadius: 14, border: '1px solid var(--border)',
          }} />
        )}

        <Btn kind="primary" full disabled={!file || loading} onClick={analyse}
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}>
          {loading ? 'Analysing…' : 'Analyse image'}
        </Btn>

        {err && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
          }}>
            <AlertTriangle size={14} style={{ marginTop: 2, flex: 'none' }} /> {err}
          </div>
        )}
      </div>

      {findings && (
        <div style={{
          background: tones[findings.urgencyHint].bg,
          border: `1px solid ${tones[findings.urgencyHint].border}`,
          borderRadius: 22, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 14,
          animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
        }}>
          {fallback && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.30)',
              borderRadius: 10, padding: '8px 12px',
              fontSize: 12, color: '#a16207',
            }}>
              <ShieldAlert size={13} style={{ marginTop: 2, flex: 'none' }} />
              AI confidence was low — please re-upload a clearer image or describe your concern in /intake.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Image type
            </span>
            <span className="mono" style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 999,
              background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--ink-2)',
            }}>{findings.imageType}</span>
          </div>

          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Observations
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: 'var(--ink-2)' }}>
              {findings.observations.map((o, i) => <li key={i}>• {o}</li>)}
            </ul>
          </div>

          {findings.redFlags.length > 0 && (
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--red-600)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Red flags
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: 'var(--red-600)' }}>
                {findings.redFlags.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 10, borderTop: '1px solid var(--border)',
            gap: 14, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)' }}>Urgency</p>
              <div style={{ marginTop: 4 }}>
                <SeverityPill level={findings.urgencyHint === 'CRITICAL' ? 'EMERGENCY' : findings.urgencyHint === 'URGENT' ? 'URGENT' : 'ROUTINE'} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)' }}>Suggested specialty</p>
              <p style={{
                margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--ink)',
                display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end',
              }}>
                <Stethoscope size={14} /> {findings.suggestedSpecialty}
              </p>
            </div>
          </div>

          <p style={{
            margin: 0, fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)',
            paddingTop: 10, borderTop: '1px solid var(--border)',
          }}>{findings.caveat}</p>

          <Link
            href={`/doctors?dept=${encodeURIComponent(findings.suggestedSpecialty)}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%',
              padding: '0 18px', height: 48, borderRadius: 14,
              background: 'var(--blue-600)', color: '#fff',
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 8px 20px -8px rgba(37,99,235,.55)',
            }}
          >
            Find a {findings.suggestedSpecialty} <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      )}
    </div>
  )
}
