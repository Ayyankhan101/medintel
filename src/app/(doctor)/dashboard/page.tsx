'use client'
import { useEffect, useState } from 'react'
import { AppointmentQueue } from '@/components/doctor/AppointmentQueue'
import { Users, Calendar, Clock, CheckCircle2 } from 'lucide-react'

interface Stats { today: number; week: number; pending: number; completed: number }

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="border rounded-xl p-4 bg-white space-y-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

export default function DoctorDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/doctor/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Doctor Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Calendar}     label="Today"     value={stats.today}     color="bg-blue-500"  />
          <StatCard icon={Users}        label="This Week" value={stats.week}      color="bg-purple-500"/>
          <StatCard icon={Clock}        label="Pending"   value={stats.pending}   color="bg-amber-500" />
          <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="bg-green-500" />
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold text-gray-800">Appointment Queue</h2>
        <AppointmentQueue />
      </div>
    </div>
  )
}
