'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Palette, Phone, MessageSquareText, Building2, ExternalLink } from 'lucide-react'

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
    if (!res.ok) {
      setError(data.error ?? 'Update failed')
      return
    }
    if (data.clinic) setClinic(data.clinic)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-slate-500">Loading…</div>
  if (!clinic) return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-red-600">No clinic linked to this account.</div>

  const previewColor = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : '#2563eb'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/clinic/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clinic settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Brand and contact details shown on your public profile at{' '}
          <Link href={`/c/${clinic.slug}`} className="underline inline-flex items-center gap-0.5" target="_blank">
            /c/{clinic.slug} <ExternalLink className="w-3 h-3" />
          </Link>
        </p>
      </header>

      <form onSubmit={save} className="space-y-6">
        {/* Identity */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4" /> Identity
          </h2>
          <Field label="Clinic name">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              minLength={2}
              maxLength={80}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </Field>
          <Field label="Public slug" hint="Set at signup, immutable.">
            <input type="text" value={clinic.slug} disabled className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-500" />
          </Field>
        </section>

        {/* Brand */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4" /> Brand color
          </h2>
          <Field label="Hex color" hint="Used for the hero gradient on /c/[slug]. Leave blank for MedIntel blue.">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={previewColor}
                onChange={e => setBrandColor(e.target.value)}
                className="h-10 w-14 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                placeholder="#2563eb"
                pattern="^#[0-9a-fA-F]{6}$"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
              />
            </div>
          </Field>
          <div
            className="mt-4 rounded-xl p-5 text-white"
            style={{ background: `linear-gradient(135deg, ${previewColor}, ${previewColor}cc)` }}
          >
            <p className="text-xs uppercase tracking-wider opacity-90">Preview</p>
            <p className="text-xl font-bold">{name || clinic.name}</p>
          </div>
        </section>

        {/* Channels */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Contact channels</h2>
          <p className="text-xs text-slate-500 mb-4">E.164 format (e.g. <code>+923001234567</code>). Leave blank to hide the button.</p>

          <Field label={<span className="inline-flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5" /> WhatsApp number</span>}>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="+923001234567"
              pattern="^\+[1-9]\d{7,14}$"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
            />
          </Field>
          <Field label={<span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Voice number</span>}>
            <input
              type="tel"
              value={voiceNumber}
              onChange={e => setVoiceNumber(e.target.value)}
              placeholder="+923001234567"
              pattern="^\+[1-9]\d{7,14}$"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
            />
          </Field>
        </section>

        {error   && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Saved.</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4 last:mb-0">
      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs text-slate-400">{hint}</span>}
    </label>
  )
}
