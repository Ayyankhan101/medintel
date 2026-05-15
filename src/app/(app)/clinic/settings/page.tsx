'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Palette, Phone, MessageSquareText, Building2, ExternalLink, Loader2 } from 'lucide-react'
import { Btn } from '@/components/design/Btn'

type Clinic = {
  id:             string
  name:           string
  slug:           string
  brandColor:     string | null
  whatsappNumber: string | null
  voiceNumber:    string | null
}

export default function ClinicSettingsPage() {
  const [clinic, setClinic]     = useState<Clinic | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const [name, setName]                     = useState('')
  const [brandColor, setBrandColor]         = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [voiceNumber, setVoiceNumber]       = useState('')

  useEffect(() => {
    fetch('/api/clinic/me')
      .then(r => r.json())
      .then(d => {
        if (d.clinic) {
          setClinic(d.clinic)
          setName(d.clinic.name ?? '')
          setBrandColor(d.clinic.brandColor ?? '')
          setWhatsappNumber(d.clinic.whatsappNumber ?? '')
          setVoiceNumber(d.clinic.voiceNumber ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    const res = await fetch('/api/clinic/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, brandColor, whatsappNumber, voiceNumber }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Update failed'); return }
    if (data.clinic) setClinic(data.clinic)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
  }

  if (loading) return <Wrap><p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</p></Wrap>
  if (!clinic) return <Wrap><p style={{ fontSize: 13, color: 'var(--red-600)' }}>No clinic linked to this account.</p></Wrap>

  const previewColor = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : '#2563eb'

  return (
    <div style={{
      maxWidth: 880, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <div>
        <Link href="/clinic/dashboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>

      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Clinic console
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Settings
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
          Brand and contact details shown on your public profile at{' '}
          <Link href={`/c/${clinic.slug}`} target="_blank"
                style={{ color: 'var(--ink-2)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            /c/{clinic.slug} <ExternalLink size={12} />
          </Link>
        </p>
      </header>

      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Section icon={<Building2 size={14} />} title="Identity">
          <Field label="Clinic name">
            <input
              type="text" required minLength={2} maxLength={80}
              value={name} onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Public slug" hint="Set at signup, immutable.">
            <input type="text" value={clinic.slug} disabled
                   style={{ ...inputStyle, background: 'var(--bg-soft)', color: 'var(--ink-3)' }} />
          </Field>
        </Section>

        <Section icon={<Palette size={14} />} title="Brand color">
          <Field label="Hex color" hint="Used for the hero gradient on /c/[slug]. Leave blank for MedIntel blue.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={previewColor}
                     onChange={e => setBrandColor(e.target.value)}
                     style={{
                       width: 56, height: 44,
                       borderRadius: 10, border: '1px solid var(--border)',
                       background: 'var(--bg-elev)', cursor: 'pointer',
                     }} />
              <input type="text" value={brandColor}
                     onChange={e => setBrandColor(e.target.value)}
                     placeholder="#2563eb"
                     pattern="^#[0-9a-fA-F]{6}$"
                     style={{ ...inputStyle, fontFamily: 'var(--font-mono)', flex: 1 }} />
            </div>
          </Field>
          <div style={{
            marginTop: 14, padding: 20, borderRadius: 14,
            background: `linear-gradient(135deg, ${previewColor}, ${previewColor}cc)`,
            color: '#fff',
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.9 }}>Preview</p>
            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700 }}>{name || clinic.name}</p>
          </div>
        </Section>

        <Section icon={<Phone size={14} />} title="Contact channels">
          <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--ink-3)' }}>
            E.164 format (e.g. <code className="mono">+923001234567</code>). Leave blank to hide the button.
          </p>
          <Field label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageSquareText size={13} /> WhatsApp number</span>}>
            <input type="tel" value={whatsappNumber}
                   onChange={e => setWhatsappNumber(e.target.value)}
                   placeholder="+923001234567" pattern="^\+[1-9]\d{7,14}$"
                   style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </Field>
          <Field label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> Voice number</span>}>
            <input type="tel" value={voiceNumber}
                   onChange={e => setVoiceNumber(e.target.value)}
                   placeholder="+923001234567" pattern="^\+[1-9]\d{7,14}$"
                   style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          </Field>
        </Section>

        {error   && <p style={{ margin: 0, fontSize: 13, color: 'var(--red-600)' }}>{error}</p>}
        {success && <p style={{ margin: 0, fontSize: 13, color: '#047857' }}>Saved.</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn kind="primary" type="submit" disabled={saving}
               leading={saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}>
            {saving ? 'Saving…' : 'Save changes'}
          </Btn>
        </div>
      </form>
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 880, margin: '0 auto', padding: '40px 16px' }}>{children}</div>
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 22, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h2 style={{
        margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'var(--ink-3)' }}>{icon}</span> {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{hint}</span>}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg-elev)', color: 'var(--ink)',
  fontSize: 14, outline: 'none', fontFamily: 'var(--font-ui)',
  boxSizing: 'border-box',
}
