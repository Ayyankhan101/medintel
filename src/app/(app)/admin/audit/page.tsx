'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Log {
  id:         string
  createdAt:  string
  action:     string
  entityType: string
  entityId:   string
  actorId:    string | null
  actorRole:  string | null
  metadata:   Record<string, unknown> | null
}

const ACTIONS = ['', 'escrow.release', 'escrow.refund', 'prescription.upload', 'kyd.approve', 'kyd.reject', 'appointment.cancel', 'appointment.reschedule']

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = filter ? `?action=${encodeURIComponent(filter)}` : ''
    fetch(`/api/admin/audit${qs}`)
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Audit log</h1>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All actions'}</option>)}
        </select>
      </div>

      {loading && <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map(l => (
              <tr key={l.id}>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">{l.action}</td>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-slate-700 dark:text-slate-200">{l.entityType}</span>
                  <span className="ml-1 font-mono text-slate-400">{l.entityId.slice(0, 8)}…</span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{l.actorId?.slice(0, 8) ?? 'system'}</span>
                  {l.actorRole && <span className="ml-1 text-[10px] uppercase tracking-wider text-slate-400">{l.actorRole}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-md truncate font-mono">
                  {l.metadata ? JSON.stringify(l.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">No entries.</div>
        )}
      </div>
    </div>
  )
}
