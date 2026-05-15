'use client'

import { useState } from 'react'
import { Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

interface Snapshot {
  id:                 string
  status:             string
  scheduledAt:        string
  cancellationReason: string | null
  cancelledBy:        string | null
  patient:  { user: { name: string | null; email: string; phone: string | null; medIntelCode: string | null } }
  doctor:   { user: { name: string | null; email: string } } | null
  escrow: {
    id: string
    amount: string
    status: 'HELD' | 'RELEASED' | 'REFUNDED'
    refundedAmount: string | null
    refundedAt: string | null
    refundReason: string | null
    stripePaymentIntentId: string
  } | null
}

export default function AdminRefundsPage() {
  const [query, setQuery]   = useState('')
  const [snap, setSnap]     = useState<Snapshot | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function lookup() {
    setError(null); setSuccess(null); setSnap(null); setLoading(true)
    try {
      const res = await fetch(`/api/admin/appointments/${encodeURIComponent(query.trim())}`)
      if (!res.ok) { setError((await res.json()).error ?? 'Not found'); return }
      setSnap(await res.json())
    } finally { setLoading(false) }
  }

  async function refund() {
    if (!snap) return
    setError(null); setSuccess(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/refund', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          appointmentId: snap.id,
          amount:        amount ? parseInt(amount, 10) : undefined,
          reason:        reason.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Refund failed'); return }
      setSuccess(`Refunded PKR ${data.refundedAmount}${data.isFull ? ' (fully refunded)' : ` (remaining: PKR ${data.remaining})`}`)
      setAmount(''); setReason('')
      // Reload snapshot
      lookup()
    } finally { setBusy(false) }
  }

  const escrow = snap?.escrow
  const total       = escrow ? Number(escrow.amount) : 0
  const refunded    = escrow?.refundedAmount ? Number(escrow.refundedAmount) : 0
  const remaining   = total - refunded
  const canRefund   = !!escrow && escrow.status !== 'REFUNDED' && remaining > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Refunds &amp; disputes</h1>
        <p className="mt-1 text-sm text-slate-500">Look up an appointment, issue a full or partial refund.</p>
      </header>

      <form onSubmit={e => { e.preventDefault(); lookup() }} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Appointment ID (cuid)"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Look up
        </button>
      </form>

      {error   && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {error}</p>}
      {success && <p className="text-sm text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {success}</p>}

      {snap && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row k="Status"        v={snap.status} />
            <Row k="Scheduled"     v={new Date(snap.scheduledAt).toLocaleString('en-PK')} />
            <Row k="Patient"       v={`${snap.patient.user.name ?? '—'} · ${snap.patient.user.email}`} />
            <Row k="Phone"         v={snap.patient.user.phone ?? '—'} />
            <Row k="Doctor"        v={snap.doctor ? `Dr. ${snap.doctor.user.name ?? '—'} · ${snap.doctor.user.email}` : '—'} />
            <Row k="MedIntel code" v={snap.patient.user.medIntelCode ?? '—'} mono />
            {snap.cancellationReason && <Row k="Cancel reason" v={snap.cancellationReason} />}
            {snap.cancelledBy        && <Row k="Cancelled by"  v={snap.cancelledBy} />}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Escrow</h3>
            {escrow ? (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row k="Total"            v={`PKR ${total.toLocaleString()}`} />
                <Row k="Status"           v={escrow.status} />
                <Row k="Refunded so far"  v={`PKR ${refunded.toLocaleString()}`} />
                <Row k="Remaining"        v={`PKR ${remaining.toLocaleString()}`} />
                <Row k="PaymentIntent"    v={escrow.stripePaymentIntentId} mono />
                {escrow.refundReason && <Row k="Last reason"   v={escrow.refundReason} />}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No escrow attached to this appointment.</p>
            )}
          </div>

          {canRefund && (
            <form onSubmit={e => { e.preventDefault(); refund() }} className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Issue refund</h3>
              <label className="block text-xs">
                <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (PKR) — leave blank for full</span>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`${remaining}`}
                  className="w-40 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason (required)</span>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  minLength={3}
                  maxLength={500}
                  rows={2}
                  required
                  placeholder="e.g. Doctor failed to provide proper diagnosis; partial refund agreed."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none"
                />
              </label>
              <button
                type="submit"
                disabled={busy || reason.trim().length < 3}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Issue refund
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 dark:text-slate-400 min-w-[100px] text-xs uppercase tracking-wider">{k}</span>
      <span className={`text-slate-900 dark:text-slate-100 ${mono ? 'font-mono text-xs' : ''} break-all`}>{v}</span>
    </div>
  )
}
