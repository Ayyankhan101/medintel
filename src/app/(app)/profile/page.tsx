'use client'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Copy, Check, Loader2, ShieldCheck, Mail, Phone, Calendar, IdCard, Trash2 } from 'lucide-react'

interface Me {
  id:            string
  email:         string
  phone:         string | null
  name:          string | null
  role:          string
  medIntelCode:  string | null
  kycStatus:     string
  kycVerifiedAt: string | null
  createdAt:     string
  patient: { dateOfBirth: string } | null
  doctor: {
    licenseNumber:   string
    specialization:  string
    consultationFee: string | number
    yearsExperience: number
    kydStatus:       string
    trustBadge:      boolean
    stripeAccountId: string | null
  } | null
}

export default function ProfilePage() {
  const [me, setMe]         = useState<Me | null>(null)
  const [err, setErr]       = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
        return r.json()
      })
      .then(setMe)
      .catch(e => setErr(e.message))
  }, [])

  async function copyCode() {
    if (!me?.medIntelCode) return
    await navigator.clipboard.writeText(me.medIntelCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (err) return <div className="max-w-2xl mx-auto px-4"><div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{err}</div></div>
  if (!me) return <div className="max-w-2xl mx-auto px-4 flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{me.name ?? me.email}</p>
      </header>

      {me.medIntelCode && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2">Your MedIntel patient code</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-wider">{me.medIntelCode}</p>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">Share this with any doctor or hospital to give them access to your records.</p>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account</h2>
        <Row icon={<Mail className="w-4 h-4 text-slate-400" />}     label="Email"   value={me.email} />
        {me.phone && <Row icon={<Phone className="w-4 h-4 text-slate-400" />} label="Phone" value={me.phone} />}
        <Row icon={<IdCard className="w-4 h-4 text-slate-400" />}   label="Role"    value={me.role} />
        <Row icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Joined"  value={new Date(me.createdAt).toLocaleDateString('en-PK', { dateStyle: 'long' })} />
        {me.kycStatus === 'VERIFIED' && (
          <Row icon={<ShieldCheck className="w-4 h-4 text-green-600" />} label="KYC" value="Verified" />
        )}
      </section>

      <DangerZone />

      {me.doctor && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Practice</h2>
          <Row label="PMDC license"   value={me.doctor.licenseNumber} mono />
          <Row label="Specialty"      value={me.doctor.specialization} />
          <Row label="Experience"     value={`${me.doctor.yearsExperience} years`} />
          <Row label="Consult fee"    value={`PKR ${Number(me.doctor.consultationFee).toLocaleString('en-PK')}`} />
          <Row label="KYD status"     value={me.doctor.kydStatus} />
          <Row label="Trust badge"    value={me.doctor.trustBadge ? 'Awarded' : 'Not awarded'} />
          <Row label="Stripe payouts" value={me.doctor.stripeAccountId ? 'Connected' : 'Not connected'} />
        </section>
      )}
    </div>
  )
}

function DangerZone() {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  const matches = confirm === 'DELETE MY ACCOUNT'

  async function destroy() {
    setBusy(true); setErr(null)
    const res  = await fetch('/api/account/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ confirm }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(data.error ?? 'Could not delete account'); return }
    await signOut({ callbackUrl: '/' })
  }

  return (
    <section className="bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
        <Trash2 className="w-4 h-4" /> Delete account
      </h2>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        Permanently deletes your personal information. Prescriptions, audit logs, and other regulated
        medical records are retained as required by PMDC and the Drugs Act 1976. Type{' '}
        <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">DELETE MY ACCOUNT</code> to confirm.
      </p>
      <input
        type="text"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="DELETE MY ACCOUNT"
        className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-950 font-mono"
      />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button
        onClick={destroy}
        disabled={!matches || busy}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold rounded-lg"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Delete my account
      </button>
    </section>
  )
}

function Row({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {icon && <div className="shrink-0">{icon}</div>}
      <span className="text-slate-500 dark:text-slate-400 min-w-[120px]">{label}</span>
      <span className={`text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
