'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ShieldAlert, MessagesSquare, Loader2, ExternalLink } from 'lucide-react'

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

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 text-sm text-slate-500"><Loader2 className="w-4 h-4 inline animate-spin" /> Loading…</div>
  if (!data)   return <div className="max-w-4xl mx-auto px-4 py-10 text-sm text-red-600">Failed to load</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Moderation queue</h1>
        <p className="mt-1 text-xs text-slate-500">Generated {new Date(data.generatedAt).toLocaleString('en-PK')}</p>
      </header>

      {/* Section 1 */}
      <Section
        title="Unmatched critical triages"
        icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
        empty="No unmatched critical triages in the last 2 hours."
        items={data.unmatchedCritical}
        render={t => (
          <li key={t.id} className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t.department} · {new Date(t.createdAt).toLocaleString('en-PK')}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{t.summary}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {t.patient.user.name ?? '—'} · {t.patient.user.email} · {t.patient.user.phone ?? 'no phone'}
                </p>
              </div>
              {t.patient.user.phone && (
                <a href={`tel:${t.patient.user.phone}`} className="shrink-0 text-xs font-semibold text-red-700 hover:underline">Call now →</a>
              )}
            </div>
          </li>
        )}
      />

      {/* Section 2 */}
      <Section
        title="Doctor no-show patterns (30d)"
        icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
        empty="No doctors flagged for repeated no-shows."
        items={data.noShowDoctors}
        render={d => (
          <li key={d.id} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dr. {d.user.name ?? '—'} · {d.specialization}</p>
              <p className="text-xs text-slate-500">{d.user.email}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-amber-700">{d.noShowCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">no-shows</p>
            </div>
          </li>
        )}
      />

      {/* Section 3 */}
      <Section
        title="Recent disputes (30d)"
        icon={<MessagesSquare className="w-4 h-4 text-blue-600" />}
        empty="No recent disputes."
        items={data.disputes}
        render={a => {
          const escrowSummary = a.escrow
            ? `${a.escrow.status} · PKR ${Number(a.escrow.amount).toLocaleString()}${a.escrow.refundedAmount ? ` (refunded ${a.escrow.refundedAmount})` : ''}`
            : 'no escrow'
          return (
            <li key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {a.patient.user.name ?? a.patient.user.email}
                    {a.doctor && <span className="text-slate-400"> → Dr. {a.doctor.user.name ?? '—'}</span>}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">&ldquo;{a.cancellationReason}&rdquo;</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {a.cancelledBy} · {new Date(a.cancelledAt).toLocaleString('en-PK')} · {escrowSummary}
                  </p>
                </div>
                <Link
                  href={`/admin/refunds?id=${a.id}`}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Review <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </li>
          )
        }}
      />
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
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
        {icon} {title} <span className="text-xs font-normal text-slate-500">({items.length})</span>
      </h2>
      {items.length === 0
        ? <p className="text-xs text-slate-400 italic">{empty}</p>
        : <ul className="space-y-2">{items.map(render)}</ul>}
    </section>
  )
}
