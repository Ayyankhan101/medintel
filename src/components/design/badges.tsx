'use client'

import * as React from 'react'
import { ShieldCheck } from 'lucide-react'
import { StatusPill } from './StatusPill'
import { useI18n } from '@/lib/i18n/client'

export function VerifiedBadge({ tier = 3, compact = false, label }: { tier?: 1 | 2 | 3; compact?: boolean; label?: string }) {
  const { T } = useI18n()
  const tierLabel = T('badge.verifiedTier').replace('{tier}', String(tier))
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: compact ? '2px 8px' : '4px 10px',
      borderRadius: 999,
      background: 'rgba(13,148,136,.10)',
      color: '#0f766e',
      fontSize: compact ? 10 : 11, fontWeight: 700,
      letterSpacing: '.04em',
      border: '1px solid rgba(13,148,136,.22)',
    }}>
      <ShieldCheck size={compact ? 11 : 12} strokeWidth={2.5} />
      {label ?? tierLabel}
    </span>
  )
}

export type ClinicPlan = 'STARTER' | 'STANDARD' | 'ENTERPRISE'

const PLAN_STYLES: Record<ClinicPlan, { bg: string; fg: string }> = {
  STARTER:    { bg: 'rgba(148,163,184,.16)', fg: 'var(--ink-2)' },
  STANDARD:   { bg: 'rgba(37,99,235,.10)',   fg: 'var(--blue-700)' },
  ENTERPRISE: { bg: 'rgba(139,92,246,.10)',  fg: 'var(--violet-600)' },
}

export function ClinicPlanPill({ plan }: { plan: ClinicPlan }) {
  const m = PLAN_STYLES[plan]
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999,
      background: m.bg, color: m.fg,
      fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
      textTransform: 'uppercase',
    }}>{plan}</span>
  )
}

export function KYDBadge({ status }: { status: 'PENDING' | 'VERIFIED' | 'REJECTED' }) {
  const { T } = useI18n()
  const map = {
    PENDING:  { tone: 'amber'   as const, label: T('badge.kydPending')  },
    VERIFIED: { tone: 'emerald' as const, label: T('badge.kydVerified') },
    REJECTED: { tone: 'red'     as const, label: T('badge.kydRejected') },
  }[status]
  return <StatusPill tone={map.tone}>{map.label}</StatusPill>
}

export function SeverityPill({ level }: { level: 'ROUTINE' | 'URGENT' | 'EMERGENCY' }) {
  const { T } = useI18n()
  const map = {
    ROUTINE:   { tone: 'emerald' as const, label: T('badge.routine')   },
    URGENT:    { tone: 'amber'   as const, label: T('badge.urgent')    },
    EMERGENCY: { tone: 'red'     as const, label: T('badge.emergency') },
  }[level]
  return <StatusPill tone={map.tone} dot={map.tone === 'red'}>{map.label}</StatusPill>
}

export function AppointmentStatusPill({ status }: { status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' }) {
  const { T } = useI18n()
  const map = {
    SCHEDULED:   { tone: 'blue'    as const, label: T('badge.scheduled') },
    IN_PROGRESS: { tone: 'emerald' as const, label: T('badge.liveNow')   },
    COMPLETED:   { tone: 'neutral' as const, label: T('badge.completed') },
    CANCELLED:   { tone: 'neutral' as const, label: T('badge.cancelled') },
    REFUNDED:    { tone: 'amber'   as const, label: T('badge.refunded')  },
  }[status]
  return <StatusPill tone={map.tone}>{map.label}</StatusPill>
}

export function EscrowStatusPill({ status }: { status: 'HELD' | 'RELEASED' | 'REFUNDED' }) {
  const { T } = useI18n()
  const map = {
    HELD:     { tone: 'amber'   as const, label: T('badge.escrowHeld') },
    RELEASED: { tone: 'emerald' as const, label: T('badge.released')   },
    REFUNDED: { tone: 'neutral' as const, label: T('badge.refunded')   },
  }[status]
  return <StatusPill tone={map.tone}>{map.label}</StatusPill>
}
