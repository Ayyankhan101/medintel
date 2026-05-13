'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2, CreditCard, Loader2, ExternalLink } from 'lucide-react'

function SettingsContent() {
  const params  = useSearchParams()
  const success = params.get('onboard') === 'success'

  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

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
    </div>
  )
}

export default function DoctorSettingsPage() {
  return <Suspense><SettingsContent /></Suspense>
}
