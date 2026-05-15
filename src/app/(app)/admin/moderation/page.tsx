'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ShieldAlert, MessagesSquare, Loader2, ExternalLink } from 'lucide-react'
import { PKR } from '@/components/design/helpers'

interface ModerationData {
  unmatchedCritical: Array<{
    id: string
    createdAt: string
    department: string
    summary: string
    patient: { user: { name: string | null; email: string; phone: string | null; medIntelCode: string | null } }
  }>
  noShowDoctors: Array<{
    id: string
    specialization: string
    noShowCount: number
    user: { name: string | null; email: string }
  }>
  disputes: Array<{
    id: string
    cancelledAt: string
    cancellationReason: string
    cancelledBy: string
    patient: { user: { name: string | null; email: string } }
    doctor:  { user: { name: string | null } } | null
    escrow:  { status: string; amount: string; refundedAmount: string | null } | null
  }>
  generatedAt: string
}

export default function ModerationPage() {
  const [data, setData]       = useState<ModerationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/moderation')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /> Loading…
    </div>
  )
  if (!data) return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 16px', fontSize: 13, color: 'var(--red-600)' }}>Failed to load</div>
  )

  return (
    <div style={{
      maxWidth: 960, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 26,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Admin
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Moderation queue
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>
          Generated {new Date(data.generatedAt).toLocaleString('en-PK')}
        </p>
      </header>

      <Section title="Unmatched critical triages"
               icon={<AlertTriangle size={14} style={{ color: 'var(--red-600)' }} />}
               empty="No unmatched critical triages in the last 2 hours."
               items={data.unmatchedCritical}
               render={t => (
        <li key={t.id} style={{
          borderRadius: 14, padding: '12px 14px',
          background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.20)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--red-600)' }}>
                {t.department} · {new Date(t.createdAt).toLocaleString('en-PK')}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t.summary}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
                {t.patient.user.name ?? '—'} · {t.patient.user.email} · {t.patient.user.phone ?? 'no phone'}
              </p>
            </div>
            {t.patient.user.phone && (
              <a href={`tel:${t.patient.user.phone}`}
                 style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: 'var(--red-600)', textDecoration: 'none' }}>
                Call now →
              </a>
            )}
          </div>
        </li>
      )} />

      <Section title="Doctor no-show patterns (30d)"
               icon={<ShieldAlert size={14} style={{ color: '#a16207' }} />}
               empty="No doctors flagged for repeated no-shows."
               items={data.noShowDoctors}
               render={d => (
        <li key={d.id} style={{
          borderRadius: 14, padding: '12px 14px',
          background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              Dr. {d.user.name ?? '—'} · {d.specialization}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>{d.user.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="mono" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#a16207' }}>{d.noShowCount}</p>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>no-shows</p>
          </div>
        </li>
      )} />

      <Section title="Recent disputes (30d)"
               icon={<MessagesSquare size={14} style={{ color: 'var(--blue-700)' }} />}
               empty="No recent disputes."
               items={data.disputes}
               render={a => {
        const escrowSummary = a.escrow
          ? `${a.escrow.status} · ${PKR(Number(a.escrow.amount))}${a.escrow.refundedAmount ? ` (refunded ${a.escrow.refundedAmount})` : ''}`
          : 'no escrow'
        return (
          <li key={a.id} style={{
            borderRadius: 14, padding: '12px 14px',
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                  {a.patient.user.name ?? a.patient.user.email}
                  {a.doctor && <span style={{ color: 'var(--ink-4)' }}> → Dr. {a.doctor.user.name ?? '—'}</span>}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>&ldquo;{a.cancellationReason}&rdquo;</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-3)' }}>
                  {a.cancelledBy} · {new Date(a.cancelledAt).toLocaleString('en-PK')} · {escrowSummary}
                </p>
              </div>
              <Link href={`/admin/refunds?id=${a.id}`}
                    style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: 'var(--blue-700)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Review <ExternalLink size={12} />
              </Link>
            </div>
          </li>
        )
      }} />
    </div>
  )
}

function Section<T>({ title, icon, items, empty, render }: {
  title: string
  icon: React.ReactNode
  items: T[]
  empty: string
  render: (item: T) => React.ReactNode
}) {
  return (
    <section>
      <h2 style={{
        margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)',
        display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        {icon} {title} <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 12 }}>({items.length})</span>
      </h2>
      {items.length === 0
        ? <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>{empty}</p>
        : <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{items.map(render)}</ul>}
    </section>
  )
}
