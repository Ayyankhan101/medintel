'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface QueueAppointment {
  id:             string
  scheduledAt:    string
  status:         string
  department?:    string | null
  severityScore?: number | null
  severityLevel?: string | null
  aiSummary?:     string | null
  patient: { user: { name: string | null; email: string; medIntelCode: string | null } }
  escrow?: { status: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
}

const SEVERITY_COLORS: Record<string, string> = {
  ROUTINE:  'bg-green-100 text-green-800',
  URGENT:   'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export function AppointmentQueue() {
  const [filter,       setFilter]       = useState('')
  const [appointments, setAppointments] = useState<QueueAppointment[]>([])
  const [loading,      setLoading]      = useState(true)

  async function load() {
    setLoading(true)
    const params = filter ? `?status=${filter}` : ''
    const res    = await fetch(`/api/doctor/queue${params}`)
    const data   = await res.json()
    setAppointments(data.appointments ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {(['', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="ml-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {!loading && appointments.length === 0 && (
        <div className="text-center py-12 text-slate-400">No appointments found.</div>
      )}

      <ul className="space-y-3">
        {appointments.map(a => {
          const scheduledAt = new Date(a.scheduledAt)
          const isCritical  = a.severityLevel === 'CRITICAL'
          return (
            <li
              key={a.id}
              className={`border rounded-xl p-4 space-y-2 bg-white hover:shadow-sm transition-shadow ${
                isCritical ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    {isCritical && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                    <p className="font-semibold text-slate-900">
                      {a.patient.user.name ?? a.patient.user.email}
                    </p>
                    {a.patient.user.medIntelCode && (
                      <span className="text-xs text-slate-400 font-mono">{a.patient.user.medIntelCode}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {scheduledAt.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {scheduledAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {a.department && <Badge variant="outline" className="text-xs">{a.department}</Badge>}
                  {a.severityLevel && (
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${SEVERITY_COLORS[a.severityLevel] ?? ''}`}>
                      {a.severityLevel} {a.severityScore != null && `(${a.severityScore}/10)`}
                    </span>
                  )}
                  <Badge variant={a.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">
                    {STATUS_LABELS[a.status] ?? a.status}
                  </Badge>
                </div>
              </div>

              {a.aiSummary && (
                <p className="text-sm text-slate-600 leading-snug bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <strong className="text-amber-700">AI:</strong> {a.aiSummary}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                {(a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS') && (
                  <a href={`/consultation/${a.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                    {a.status === 'IN_PROGRESS' ? 'Rejoin Call →' : 'Start Consultation →'}
                  </a>
                )}
                {a.escrow?.status === 'HELD' && (
                  <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded">
                    Payment Held
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
