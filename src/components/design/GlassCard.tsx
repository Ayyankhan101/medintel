'use client'

type GlassTone = 'default' | 'amber' | 'red' | 'violet' | 'blue' | 'emerald'

interface GlassCardProps {
  children: React.ReactNode
  as?: 'section' | 'div' | 'li'
  tone?: GlassTone
  hover?: boolean
  className?: string
  style?: React.CSSProperties
  padding?: number | string
}

const TONE_BG: Record<GlassTone, string> = {
  default: 'var(--glass-bg)',
  amber:   'rgba(245,158,11,.06)',
  red:     'rgba(239,68,68,.05)',
  violet:  'rgba(139,92,246,.06)',
  blue:    'rgba(37,99,235,.06)',
  emerald: 'rgba(16,185,129,.06)',
}
const TONE_BORDER: Record<GlassTone, string> = {
  default: 'var(--glass-border)',
  amber:   'rgba(245,158,11,.22)',
  red:     'rgba(239,68,68,.20)',
  violet:  'rgba(139,92,246,.20)',
  blue:    'rgba(37,99,235,.20)',
  emerald: 'rgba(16,185,129,.20)',
}

export function GlassCard({
  children, as: Tag = 'div', tone = 'default', hover = false,
  className = '', style = {}, padding = 18,
}: GlassCardProps) {
  return (
    <Tag
      className={`glass ${hover ? 'glass-hover' : ''} ${className}`}
      style={{
        '--glass-bg': TONE_BG[tone],
        borderColor: TONE_BORDER[tone],
        padding,
        borderRadius: 18,
        ...style,
      } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}
