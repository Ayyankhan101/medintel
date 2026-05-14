'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Calendar, Video, Loader2, Stethoscope, ShieldCheck, ArrowRight,
} from 'lucide-react'

interface Appointment {
  id:          string
  scheduledAt: string
  status:      string
  doctor: {
    id:              string
    specialization:  string
    consultationFee: string | number
    user: { name: string | null; email: string }
  } | null
  escrow: { amount: string | number; status: string } | null
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [appt, setAppt] = useState<Appointment | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/appointments/${id}`)
      .then(async r => r.ok ? r.json() : Promise.reject((await r.json()).error))
      .then(setAppt)
      .catch(e => setErr(typeof e === 'string' ? e : 'Failed to load'))
  }, [id])

  if (err) return <Centered><p className="text-red-600 text-sm">{err}</p></Centered>
  if (!appt) return <Centered><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></Centered>

  const when = new Date(appt.scheduledAt)
  const fmt  = new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' }).format(when)
  const fee  = appt.escrow?.amount ?? appt.doctor?.consultationFee

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-100 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">You're booked</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          A confirmation email is on the way. Save the calendar invite so you don't miss it.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {appt.doctor && (
          <Row icon={<Stethoscope className="w-4 h-4" />} label="Doctor">
            <Link href={`/doctors/${appt.doctor.id}`} className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
              {appt.doctor.user.name ?? 'Doctor'}
            </Link>
            <span className="block text-xs text-slate-500">{appt.doctor.specialization}</span>
          </Row>
        )}
        <Row icon={<Calendar className="w-4 h-4" />} label="When">
          <span className="font-medium text-slate-900 dark:text-slate-100">{fmt}</span>
          <span className="block text-xs text-slate-500">Asia/Karachi · ~30 min</span>
        </Row>
        {fee !== undefined && (
          <Row icon={<ShieldCheck className="w-4 h-4" />} label="Payment">
            <span className="font-medium text-slate-900 dark:text-slate-100">PKR {Number(fee).toLocaleString()}</span>
            <span className="block text-xs text-slate-500">Held in escrow until the doctor uploads your prescription.</span>
          </Row>
        )}
        <Row icon={<span className="font-mono text-[10px]">ID</span>} label="Reference">
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{appt.id}</span>
        </Row>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/consultation/${appt.id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          <Video className="w-4 h-4" /> Join consultation
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <a
          href={`/api/appointments/${appt.id}/ics`}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Calendar className="w-4 h-4" /> Add to calendar
        </a>
      </div>

      <div className="text-center">
        <Link href="/history" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">
          View all appointments →
        </Link>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="max-w-xl mx-auto px-4 py-10 flex justify-center">{children}</div>
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}
