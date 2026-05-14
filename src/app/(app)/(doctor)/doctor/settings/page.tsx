'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2, CreditCard, Loader2, ExternalLink, Clock } from 'lucide-react'
import { DEFAULT_AVAILABILITY, type Availability } from '@/lib/availability'

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function SettingsContent() {
  const params  = useSearchParams()
  const success = params.get('onboard') === 'success'

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [av,      setAv]       = useState<Availability>(DEFAULT_AVAILABILITY)
  const [avSaving, setAvSaving] = useState(false)
  const [avSaved,  setAvSaved]  = useState(false)
  const [avErr,    setAvErr]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/doctor/availability')
      .then(r => r.json())
      .then(d => { if (d.availability) setAv(d.availability) })
      .catch(() => {})
  }, [])

  function toggleDay(d: number) {
    setAv(a => ({ ...a, days: a.days.includes(d) ? a.days.filter(x => x !== d) : [...a.days, d].sort() }))
  }

  async function saveAvailability() {
    setAvSaving(true); setAvErr(null); setAvSaved(false)
    try {
      const res = await fetch('/api/doctor/availability', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(av),
      })
      if (!res.ok) throw new Error((await res.json()).error?.message ?? (await res.json()).error ?? `HTTP ${res.status}`)
      setAvSaved(true)
      setTimeout(() => setAvSaved(false), 2000)
    } catch (e) {
      setAvErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setAvSaving(false)
    }
  }

  async function startOnboarding() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/stripe/onboard', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start onboarding')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start onboarding')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and payment details</p>
      </div>

      {success && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-semibold">Stripe onboarding complete!</p>
            <p className="text-green-700 mt-0.5">You can now receive consultation payments directly to your bank account.</p>
          </div>
        </div>
      )}

      {/* Payments section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-800">Payment Setup</h2>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          Connect your Stripe account to receive payments from consultations.
          Funds are held in escrow and released automatically once you upload a prescription.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={startOnboarding}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
            : <><ExternalLink className="w-4 h-4" /> {success ? 'Update Stripe Account' : 'Connect with Stripe'}</>
          }
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-800">Working hours</h2>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          Patients can only book inside this window (Asia/Karachi time). Leave blank to be always available.
        </p>

        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">Days</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  av.days.includes(d)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-600">
            Start hour
            <input
              type="number"
              min={0}
              max={23}
              value={av.startHour}
              onChange={e => setAv(a => ({ ...a, startHour: Math.max(0, Math.min(23, parseInt(e.target.value || '0', 10))) }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            End hour
            <input
              type="number"
              min={1}
              max={24}
              value={av.endHour}
              onChange={e => setAv(a => ({ ...a, endHour: Math.max(1, Math.min(24, parseInt(e.target.value || '1', 10))) }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
            />
          </label>
        </div>

        {avErr  && <div className="text-xs text-red-600">{avErr}</div>}
        {avSaved && <div className="text-xs text-green-600">Saved.</div>}

        <button
          onClick={saveAvailability}
          disabled={avSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
        >
          {avSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save availability'}
        </button>
      </div>
    </div>
  )
}

export default function DoctorSettingsPage() {
  return <Suspense><SettingsContent /></Suspense>
}
