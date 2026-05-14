'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Stethoscope, Calendar, Banknote, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react'

interface Stats {
  patients: number
  doctors: { pending: number; verified: number; rejected: number; total: number }
  appointments: { total: number; completed: number; cancelled: number }
  escrow: { held: number; released: number }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
        return r.json()
      })
      .then(setStats)
      .catch(e => setErr(e.message))
  }, [])

  if (err) return <div className="max-w-3xl mx-auto px-4"><div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{err}</div></div>
  if (!stats) return <div className="max-w-3xl mx-auto px-4 flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<Users   className="w-5 h-5 text-blue-600" />}   label="Patients"           value={stats.patients} />
        <Stat icon={<Stethoscope className="w-5 h-5 text-green-600" />} label="Verified doctors" value={stats.doctors.verified} />
        <Stat icon={<Calendar className="w-5 h-5 text-amber-600" />} label="Appointments"        value={stats.appointments.total} />
        <Stat icon={<Banknote className="w-5 h-5 text-emerald-600" />} label="Escrow held"       value={stats.escrow.held} />
      </div>

      <Link
        href="/admin/doctors?status=PENDING"
        className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
      >
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{stats.doctors.pending} doctors waiting for verification</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Review credentials and approve or reject</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </Link>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Doctors</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <BreakdownRow label="Pending"  value={stats.doctors.pending}  color="text-amber-600" />
          <BreakdownRow label="Verified" value={stats.doctors.verified} color="text-green-600" />
          <BreakdownRow label="Rejected" value={stats.doctors.rejected} color="text-red-600" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Appointments</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <BreakdownRow label="Total"     value={stats.appointments.total}     color="text-slate-700 dark:text-slate-200" />
          <BreakdownRow label="Completed" value={stats.appointments.completed} color="text-green-600" />
          <BreakdownRow label="Cancelled" value={stats.appointments.cancelled} color="text-red-600" />
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-slate-500 dark:text-slate-400">{label}</span></div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value.toLocaleString('en-PK')}</p>
    </div>
  )
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
