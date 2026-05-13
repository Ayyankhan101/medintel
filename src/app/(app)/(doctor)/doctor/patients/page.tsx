'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Clock, CheckCircle2, AlertTriangle, Video } from 'lucide-react'

interface Appointment {
  id: string
  status: string
  scheduledAt: string
  severityLevel: string | null
  aiSummary: string | null
  patient: {
    user: { name: string | null; email: string; medIntelCode: string | null }
  }
  escrow: { status: string } | null
}

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  SCHEDULED:   { label: 'Scheduled',   icon: Clock,         bg: 'bg-blue-50',    text: 'text-blue-700'    },
  IN_PROGRESS: { label: 'In Progress', icon: Video,         bg: 'bg-amber-50',   text: 'text-amber-700'   },
  COMPLETED:   { label: 'Completed',   icon: CheckCircle2,  bg: 'bg-emerald-50', text: 'text-emerald-700' },
}
const SEV_CFG: Record<string, string> = {
  ROUTINE:  'bg-green-100 text-green-700',
  URGENT:   'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function DoctorPatientsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState<string>('ALL')
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    setLoading(true)
    const qs = filter !== 'ALL' ? `?status=${filter}` : ''
    fetch(`/api/doctor/queue${qs}`)
      .then(r => r.json())
      .then(data => { setAppointments(data.appointments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const filtered = appointments.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.patient.user.name?.toLowerCase().includes(q) ||
      a.patient.user.email.toLowerCase().includes(q) ||
      a.patient.user.medIntelCode?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Patients</h1>
          <p className="text-sm text-slate-500 mt-0.5">All appointments assigned to you</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">{appointments.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or MedIntel code…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-medium text-slate-500">No patients found</p>
          <p className="text-sm mt-1">
            {filter !== 'ALL' ? 'Try changing the filter' : 'Patients will appear here once appointments are booked'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(a => {
          const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.SCHEDULED
          const Icon = cfg.icon
          const name = a.patient.user.name ?? a.patient.user.email

          return (
            <div
              key={a.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm hover:border-blue-200 transition-all cursor-pointer"
              onClick={() => router.push(`/consultation/${a.id}`)}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-semibold text-slate-600 text-sm shrink-0">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {a.patient.user.medIntelCode ?? a.patient.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {a.severityLevel && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEV_CFG[a.severityLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                      {a.severityLevel}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                </div>
              </div>

              {a.aiSummary && (
                <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">{a.aiSummary}</p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  {new Date(a.scheduledAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs font-medium text-blue-600 hover:underline">
                  Open consultation →
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
