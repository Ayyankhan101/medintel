'use client'
import { useEffect, useState } from 'react'
import { Building2, MessageSquareText, PhoneCall, Stethoscope, Globe, Loader2, CreditCard, Sparkles } from 'lucide-react'

interface ClinicData {
  clinic: {
    id:             string
    name:           string
    slug:           string
    plan:           'STARTER' | 'STANDARD' | 'ENTERPRISE'
    minutesQuota:   number
    minutesUsed:    number
    whatsappNumber: string | null
    voiceNumber:    string | null
    active:         boolean
    stripeCustomerId:     string | null
    stripeSubscriptionId: string | null
    currentPeriodEnd:     string | null
    _count:         { doctors: number; members: number }
  }
  usage30d: { channel: string; minutes: number }[]
}

const ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquareText className="w-4 h-4" />,
  voice:    <PhoneCall className="w-4 h-4" />,
  scribe:   <Stethoscope className="w-4 h-4" />,
  web:      <Globe className="w-4 h-4" />,
}

export default function ClinicDashboard() {
  const [data,    setData]    = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clinic/me')
      .then(async r => r.ok ? r.json() : Promise.reject((await r.json()).error ?? 'Load failed'))
      .then(setData)
      .catch(e => setErr(typeof e === 'string' ? e : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Wrap><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></Wrap>
  if (err || !data) return <Wrap><p className="text-sm text-red-600">{err ?? 'No clinic linked.'}</p></Wrap>

  const { clinic, usage30d } = data
  const pct = Math.min(100, Math.round((clinic.minutesUsed / clinic.minutesQuota) * 100))

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{clinic.name}</h1>
          <p className="text-xs text-slate-500">Plan: <strong>{clinic.plan}</strong> · {clinic._count.doctors} doctor(s)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Minutes this month</h2>
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-900 dark:text-slate-100">{clinic.minutesUsed.toLocaleString()}</span>
            {' / '}
            {clinic.minutesQuota.toLocaleString()}
          </p>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct >= 90 && <p className="mt-2 text-xs text-red-600">Approaching your monthly quota — upgrade your plan to avoid interruption.</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['whatsapp', 'voice', 'scribe', 'web'].map(ch => {
          const row = usage30d.find(u => u.channel === ch)
          return (
            <div key={ch} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider">
                {ICON[ch]} {ch}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{(row?.minutes ?? 0).toLocaleString()}</p>
              <p className="text-xs text-slate-400">minutes / 30 days</p>
            </div>
          )
        })}
      </div>

      <BillingCard
        plan={clinic.plan}
        hasSubscription={!!clinic.stripeSubscriptionId}
        periodEnd={clinic.currentPeriodEnd}
      />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Channels</h2>
        <Row label="WhatsApp number" value={clinic.whatsappNumber} />
        <Row label="Voice number"    value={clinic.voiceNumber} />
        <Row label="Public slug"     value={`/c/${clinic.slug}`} />
        <p className="mt-3 text-xs text-slate-400">
          To link more numbers or change branding, contact <a href="mailto:support@medintel.app" className="underline">support@medintel.app</a>.
        </p>
      </div>
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto px-4 py-10">{children}</div>
}

function BillingCard({ plan, hasSubscription, periodEnd }: {
  plan: 'STARTER' | 'STANDARD' | 'ENTERPRISE'
  hasSubscription: boolean
  periodEnd: string | null
}) {
  const [busy, setBusy] = useState<'STARTER' | 'STANDARD' | 'portal' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  async function checkout(target: 'STARTER' | 'STANDARD') {
    setBusy(target); setErr(null)
    const r = await fetch('/api/clinic/billing/checkout', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ plan: target }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.url) { window.location.href = d.url; return }
    setBusy(null); setErr(d.error ?? 'Checkout failed')
  }

  async function portal() {
    setBusy('portal'); setErr(null)
    const r = await fetch('/api/clinic/billing/portal', { method: 'POST' })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.url) { window.location.href = d.url; return }
    setBusy(null); setErr(d.error ?? 'Portal failed')
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4" /> Billing
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">{plan}</span>
      </div>

      {periodEnd && (
        <p className="text-xs text-slate-500 mb-3">
          Current period ends {new Date(periodEnd).toLocaleDateString('en-PK', { dateStyle: 'medium' })}.
        </p>
      )}

      {err && <p className="text-xs text-red-600 mb-3">{err}</p>}

      <div className="flex flex-wrap gap-2">
        {hasSubscription ? (
          <button
            onClick={portal}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium disabled:opacity-50"
          >
            {busy === 'portal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            Manage billing
          </button>
        ) : (
          <>
            <button
              onClick={() => checkout('STARTER')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === 'STARTER' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Activate Starter
            </button>
            <button
              onClick={() => checkout('STANDARD')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {busy === 'STANDARD' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Upgrade to Standard
            </button>
          </>
        )}
        <a
          href="mailto:partners@medintel.app?subject=Enterprise%20plan%20-%20MedIntel"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Talk to sales (Enterprise)
        </a>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{value ?? '—'}</span>
    </div>
  )
}
