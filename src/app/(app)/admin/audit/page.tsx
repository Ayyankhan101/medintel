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
    <div style={{
      maxWidth: 1180, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a16207', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Admin
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Audit log
          </h1>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-elev)', color: 'var(--ink)',
            fontSize: 13, fontFamily: 'var(--font-ui)', outline: 'none',
          }}
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All actions'}</option>)}
        </select>
      </header>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      )}

      <div style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--bg-soft)' }}>
              <tr>
                {['When', 'Action', 'Entity', 'Actor', 'Detail'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, color: 'var(--ink-3)',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                    {new Date(l.createdAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink-2)' }}>
                    {l.action}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink-3)' }}>
                    <span style={{ color: 'var(--ink-2)' }}>{l.entityType}</span>
                    <span className="mono" style={{ marginLeft: 4, color: 'var(--ink-4)' }}>{l.entityId.slice(0, 8)}…</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink-3)' }}>
                    <span className="mono">{l.actorId?.slice(0, 8) ?? 'system'}</span>
                    {l.actorRole && (
                      <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--ink-4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        {l.actorRole}
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{
                    padding: '10px 14px', fontSize: 11, color: 'var(--ink-3)',
                    maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {l.metadata ? JSON.stringify(l.metadata) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--ink-3)' }}>No entries.</div>
        )}
      </div>
    </div>
  )
}
