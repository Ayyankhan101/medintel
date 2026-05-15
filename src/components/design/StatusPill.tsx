import * as React from 'react'
import type { StatusTone } from './helpers'

const TONES: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: 'var(--bg-soft)',          fg: 'var(--ink-2)',     dot: 'var(--ink-4)' },
  blue:    { bg: 'rgba(37,99,235,.10)',     fg: 'var(--blue-600)',  dot: 'var(--blue-600)' },
  violet:  { bg: 'rgba(139,92,246,.12)',    fg: 'var(--violet-500)',dot: 'var(--violet-500)' },
  amber:   { bg: 'rgba(245,158,11,.12)',    fg: '#a16207',          dot: 'var(--amber-500)' },
  red:     { bg: 'rgba(239,68,68,.10)',     fg: 'var(--red-600)',   dot: 'var(--red-500)' },
  emerald: { bg: 'rgba(16,185,129,.12)',    fg: '#047857',          dot: 'var(--emerald-500)' },
}

export function StatusPill({ tone = 'neutral', children, dot = true }: {
  tone?: StatusTone; children: React.ReactNode; dot?: boolean
}) {
  const t = TONES[tone]
  const ringShadow =
    tone === 'blue' ? '0 0 0 4px rgba(37,99,235,.14)' :
    tone === 'red'  ? '0 0 0 4px rgba(239,68,68,.12)' : 'none'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: t.bg, color: t.fg,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600, letterSpacing: '.005em',
      transition: 'background-color 320ms var(--ease-out-quart), color 320ms var(--ease-out-quart)',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot, boxShadow: ringShadow }} />}
      {children}
    </span>
  )
}
