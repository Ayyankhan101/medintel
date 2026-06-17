'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/client'

interface Notif {
  id:        string
  category:  string
  title:     string
  body:      string
  href:      string | null
  readAt:    string | null
  createdAt: string
}

const REFRESH_MS = 60_000

export function NotificationsBell() {
  const [items,  setItems]  = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const { T } = useI18n()
  const [open,   setOpen]   = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items ?? [])
      setUnread(data.unread ?? 0)
    } catch { /* offline — surface zero */ }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  async function markAllRead() {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids: 'all' }),
    })
    setUnread(0)
    setItems(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? T('notification.unread').replace('{n}', String(unread)) : T('notification.title')}
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-600 hover:bg-slate-100"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">{T('notification.title')}</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                <Check size={12} /> {T('notification.markRead')}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-slate-400">{T('notification.empty')}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map(n => {
                const inner = (
                  <div className={`px-3 py-2 ${n.readAt ? '' : 'bg-blue-50/40'}`}>
                    <div className="text-sm font-medium text-slate-900">{n.title}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">{n.body}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('en-PK')}</div>
                  </div>
                )
                return (
                  <li key={n.id}>
                    {n.href ? <Link href={n.href} onClick={() => setOpen(false)}>{inner}</Link> : inner}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
