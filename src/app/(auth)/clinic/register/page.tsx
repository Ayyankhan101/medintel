'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'

type Plan = 'STARTER' | 'STANDARD' | 'ENTERPRISE'

const PLANS: { id: Plan; name: string; minutes: string; price: string; tagline: string }[] = [
  { id: 'STARTER',    name: 'Starter',    minutes: '2,000 / mo',  price: 'PKR 25,000/mo',  tagline: 'Small clinics getting started' },
  { id: 'STANDARD',   name: 'Standard',   minutes: '8,000 / mo',  price: 'PKR 80,000/mo',  tagline: 'Most popular for group practices' },
  { id: 'ENTERPRISE', name: 'Enterprise', minutes: '25,000 / mo', price: 'Custom',         tagline: 'Hospital networks, SLA + CSM' },
]

export default function ClinicRegisterPage() {
  const [form, setForm] = useState({
    clinicName: '',
    fullName:   '',
    email:      '',
    phone:      '+92',
    password:   '',
    plan:       'STARTER' as Plan,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState<{ slug: string } | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const r = await fetch('/api/clinic/register', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const d = await r.json().catch(() => ({}))
    setLoading(false)
    if (!r.ok) {
      const msg = typeof d.error === 'string'
        ? d.error
        : 'Signup failed. Check the form and try again.'
      setError(msg)
      return
    }
    setDone({ slug: d.slug })
  }

  if (done) return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-600" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Clinic created</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Check your email to verify your account. Once verified, sign in to access the
          clinic dashboard at <code className="font-mono">/c/{done.slug}</code>.
        </p>
        <Link href="/login" className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          Continue to sign in <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — pitch */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          <span className="font-bold text-lg">MedIntel for Clinics</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Your front desk,<br/>on autopilot.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            WhatsApp triage, voice booking, AI clinical scribe, and a single dashboard
            for every minute used.
          </p>
          <ul className="space-y-2 pt-4 text-sm text-blue-100">
            {[
              'Urdu / Pashto / Punjabi / Sindhi voice intake',
              'AI SOAP notes — doctors approve before they enter the record',
              'NADRA + PMDC identity for patients and providers',
              'Escrow-protected payments with Stripe Connect',
            ].map(t => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-blue-200">Need a managed pilot? <a href="mailto:partners@medintel.app" className="underline">partners@medintel.app</a></p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create your clinic</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No credit card required. Switch plans any time.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Clinic name"    value={form.clinicName} onChange={v => set('clinicName', v)} placeholder="Karachi Heart Center" />
            <Field label="Your full name" value={form.fullName}   onChange={v => set('fullName',   v)} placeholder="Dr. Ayesha Khan" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email"        type="email" value={form.email}   onChange={v => set('email',   v)} placeholder="you@clinic.pk" />
              <Field label="Phone"        type="tel"   value={form.phone}   onChange={v => set('phone',   v)} placeholder="+92 300 ..." />
            </div>
            <Field label="Password (8+ chars)" type="password" value={form.password} onChange={v => set('password', v)} placeholder="" />

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set('plan', p.id)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      form.plan === p.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.minutes}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 font-medium">{p.price}</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">{p.tagline}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create clinic
            </button>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
