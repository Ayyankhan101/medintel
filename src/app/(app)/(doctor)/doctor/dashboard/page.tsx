'use client'
import { useEffect, useState } from 'react'
import { AppointmentQueue } from '@/components/doctor/AppointmentQueue'
import { Users, CalendarDays, Clock3, CheckCircle2, TrendingUp } from 'lucide-react'

interface Stats { today: number; week: number; pending: number; completed: number }

export default function DoctorDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/doctor/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const cards = stats ? [
    { icon: CalendarDays, label: 'Today',     value: stats.today,     light: 'bg-blue-50',    text: 'text-blue-600'    },
    { icon: Users,        label: 'This Week', value: stats.week,      light: 'bg-violet-50',  text: 'text-violet-600'  },
    { icon: Clock3,       label: 'Pending',   value: stats.pending,   light: 'bg-amber-50',   text: 'text-amber-600'   },
    { icon: CheckCircle2, label: 'Completed', value: stats.completed, light: 'bg-emerald-50', text: 'text-emerald-600' },
  ] : []

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-700">Online</span>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.light}`}>
                <c.icon className={`w-5 h-5 ${c.text}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{c.value}</p>
                <p className="text-sm text-slate-400 mt-0.5">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800">Appointment Queue</h2>
        </div>
        <AppointmentQueue />
      </div>
    </div>
  )
}
