'use client'

import { useI18n } from '@/lib/i18n/client'

interface Props {
  score: number
  level: 'ROUTINE' | 'URGENT' | 'CRITICAL'
}

const styleConfig = {
  ROUTINE:  { bg: 'bg-green-100',  text: 'text-green-800' },
  URGENT:   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  CRITICAL: { bg: 'bg-red-100',    text: 'text-red-800' },
}

export function SeverityBadge({ score, level }: Props) {
  const { T } = useI18n()
  const { bg, text } = styleConfig[level]
  const label = level === 'CRITICAL' ? T('badge.critical') : level === 'URGENT' ? T('badge.urgent') : T('badge.routine')
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {label} ({score}/10)
    </span>
  )
}
