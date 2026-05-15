'use client'

import { useState } from 'react'
import { Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { EscrowStatusPill, AppointmentStatusPill } from '@/components/design/badges'
import { PKR } from '@/components/design/helpers'

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
      setSuccess(`Refunded ${PKR(data.refundedAmount)}${data.isFull ? ' (fully refunded)' : ` (remaining: ${PKR(data.remaining)})`}`)
      setAmount(''); setReason('')
      lookup()
    } finally { setBusy(false) }
  }

  const escrow      = snap?.escrow
  const total       = escrow ? Number(escrow.amount) : 0
  const refunded    = escrow?.refundedAmount ? Number(escrow.refundedAmount) : 0
  const remaining   = total - refunded
  const canRefund   = !!escrow && escrow.status !== 'REFUNDED' && remaining > 0

  return (
    <div style={{
      maxWidth: 880, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Admin
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Refunds &amp; disputes
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
          Look up an appointment, issue a full or partial refund.
        </p>
      </header>

      <form onSubmit={e => { e.preventDefault(); lookup() }}
            style={{ display: 'flex', gap: 8 }}>
        <input
          type="text" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Appointment ID (cuid)"
          style={{
            flex: 1, padding: '10px 14px',
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--bg-elev)', color: 'var(--ink)',
            fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
          }}
          onFocus={e => { e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,.14)'; e.target.style.borderColor = 'var(--blue-600)' }}
          onBlur={e => { e.target.style.boxShadow = ''; e.target.style.borderColor = 'var(--border)' }}
        />
        <Btn kind="primary" type="submit" disabled={!query.trim() || loading}
             leading={loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}>
          Look up
        </Btn>
      </form>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {success && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#047857',
        }}>
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      {snap && (
        <section style={{
          background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 22, padding: 22, boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppointmentStatusPill status={snap.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'} />
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {new Date(snap.scheduledAt).toLocaleString('en-PK')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 18px' }}>
            <Row k="Patient"       v={`${snap.patient.user.name ?? '—'} · ${snap.patient.user.email}`} />
            <Row k="Phone"         v={snap.patient.user.phone ?? '—'} />
            <Row k="Doctor"        v={snap.doctor ? `Dr. ${snap.doctor.user.name ?? '—'} · ${snap.doctor.user.email}` : '—'} />
            <Row k="MedIntel code" v={snap.patient.user.medIntelCode ?? '—'} mono />
            {snap.cancellationReason && <Row k="Cancel reason" v={snap.cancellationReason} />}
            {snap.cancelledBy        && <Row k="Cancelled by"  v={snap.cancelledBy} />}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Escrow</h3>
            {escrow ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <EscrowStatusPill status={escrow.status} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px 18px' }}>
                  <Row k="Total"           v={PKR(total)} mono />
                  <Row k="Refunded so far" v={PKR(refunded)} mono />
                  <Row k="Remaining"       v={PKR(remaining)} mono />
                  <Row k="PaymentIntent"   v={escrow.stripePaymentIntentId} mono />
                  {escrow.refundReason && <Row k="Last reason" v={escrow.refundReason} />}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>No escrow attached to this appointment.</p>
            )}
          </div>

          {canRefund && (
            <form onSubmit={e => { e.preventDefault(); refund() }}
                  style={{
                    borderTop: '1px solid var(--border)', paddingTop: 14,
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Issue refund</h3>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Amount (PKR) — blank for full
                </span>
                <input
                  type="number" min={1} max={remaining} value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`${remaining}`}
                  style={{
                    width: 200, padding: '10px 12px',
                    borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg-elev)', color: 'var(--ink)',
                    fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Reason (required)
                </span>
                <textarea
                  value={reason} onChange={e => setReason(e.target.value)}
                  minLength={3} maxLength={500} rows={2} required
                  placeholder="e.g. Doctor failed to provide proper diagnosis; partial refund agreed."
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg-elev)', color: 'var(--ink)',
                    fontSize: 13, lineHeight: 1.5, resize: 'vertical',
                    outline: 'none', fontFamily: 'var(--font-ui)',
                  }}
                />
              </label>
              <Btn kind="primary" type="submit"
                   disabled={busy || reason.trim().length < 3}
                   style={{ background: 'var(--red-600)', boxShadow: '0 4px 12px -4px rgba(239,68,68,.55)' }}
                   leading={busy ? <Loader2 size={14} className="animate-spin" /> : null}>
                Issue refund
              </Btn>
            </form>
          )}
        </section>
      )}
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <span style={{
        minWidth: 110, fontSize: 10, fontWeight: 700,
        color: 'var(--ink-4)', letterSpacing: '.06em', textTransform: 'uppercase',
      }}>{k}</span>
      <span className={mono ? 'mono' : ''} style={{
        fontSize: mono ? 12 : 13,
        color: 'var(--ink)', wordBreak: 'break-all',
      }}>{v}</span>
    </div>
  )
}
