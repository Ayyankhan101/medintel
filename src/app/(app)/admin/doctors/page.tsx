'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, X, Loader2, ShieldCheck } from 'lucide-react'

interface Doctor {
  id: string
  licenseNumber: string
  specialization: string
  qualifications: string | null
  yearsExperience: number
  consultationFee: string | number
  bio: string | null
  kydStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  trustBadge: boolean
  stripeAccountId: string | null
  user: { id: string; name: string | null; email: string; phone: string | null; createdAt: string }
  _count: { appointments: number }
}

type Filter = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'

export default function AdminDoctorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    }>
      <AdminDoctorsInner />
    </Suspense>
  )
}

function AdminDoctorsInner() {
  const search = useSearchParams()
  const initial = (search.get('status') ?? 'PENDING') as Filter
  const [filter, setFilter] = useState<Filter>(initial)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const qs = filter === 'ALL' ? '' : `?status=${filter}`
    fetch(`/api/admin/doctors${qs}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { setDoctors(d.doctors); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load() }, [load])

  async function decide(id: string, approve: boolean) {
    const reason = approve ? '' : prompt('Reason for rejection:')
    if (!approve && !reason) return
    const trustBadge = approve ? confirm('Award trust badge (Tier 3)?') : false

    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/doctors/${id}/verify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approve ? { decision: 'approve', trustBadge } : { decision: 'reject', reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error ?? `HTTP ${res.status}`)
        return
      }
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Doctor verification</h1>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-sm">
          {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition ${
                filter === f
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{error}</div>}
      {loading && <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      {!loading && doctors.length === 0 && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
          No doctors in this state.
        </div>
      )}

      <div className="space-y-3">
        {doctors.map(d => (
          <div key={d.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Dr. {d.user.name ?? '—'}</p>
                  {d.trustBadge && <span title="Trust badge" className="text-amber-500"><ShieldCheck className="w-4 h-4" /></span>}
                  <StatusPill status={d.kydStatus} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{d.user.email}{d.user.phone ? ` · ${d.user.phone}` : ''}</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                  <Field label="PMDC"           value={d.licenseNumber} mono />
                  <Field label="Specialty"      value={d.specialization} />
                  <Field label="Experience"     value={`${d.yearsExperience} yrs`} />
                  <Field label="Fee"            value={`PKR ${Number(d.consultationFee).toLocaleString('en-PK')}`} />
                  <Field label="Qualifications" value={d.qualifications ?? '—'} />
                  <Field label="Bookings"       value={String(d._count.appointments)} />
                  <Field label="Stripe"         value={d.stripeAccountId ? 'connected' : 'not connected'} />
                  <Field label="Joined"         value={new Date(d.user.createdAt).toLocaleDateString('en-PK')} />
                </div>
                {d.bio && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{d.bio}</p>}
              </div>
              {d.kydStatus === 'PENDING' && (
                <div className="flex flex-col gap-2">
                  <button
                    disabled={busyId === d.id}
                    onClick={() => decide(d.id, true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    {busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    disabled={busyId === d.id}
                    onClick={() => decide(d.id, false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
      <p className={`text-slate-700 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: Doctor['kydStatus'] }) {
  const cls = status === 'PENDING'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : status === 'VERIFIED' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                     : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  return <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
}
