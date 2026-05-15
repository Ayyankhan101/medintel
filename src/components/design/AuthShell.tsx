'use client'

import * as React from 'react'
import { Shield } from 'lucide-react'

type Side = 'default' | 'doctor' | 'clinic'

const PALETTES: Record<Side, { from: string; to: string }> = {
  default: { from: 'var(--blue-700)', to: 'var(--violet-600)' },
  doctor:  { from: '#7c3aed',         to: '#4338ca' },
  clinic:  { from: '#0d9488',         to: '#0e7490' },
}

const COPY: Record<Side, { kicker: string; title: string; line: string }> = {
  default: {
    kicker: 'Patient',
    title:  'Care that meets you where you are.',
    line:   'Five languages. PMDC-verified doctors. Escrow protection.',
  },
  doctor: {
    kicker: 'For doctors',
    title:  'Practice digitally. Get paid same day.',
    line:   'PMDC re-verification every 90 days. Stripe Connect payouts. AI-assisted notes.',
  },
  clinic: {
    kicker: 'For clinics',
    title:  'Stand up a clinic in a weekend.',
    line:   'Branded patient profile. WhatsApp + voice numbers. Per-doctor analytics.',
  },
}

export function AuthShell({
  side = 'default',
  kicker,
  title,
  sub,
  children,
}: {
  side?: Side
  kicker?: string
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 460px)',
    }}>
      <BrandPanel variant={side} />
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 'clamp(24px, 4vw, 56px)',
        background: 'var(--bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {kicker && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--blue-700)',
              letterSpacing: '.08em', textTransform: 'uppercase',
            }}>{kicker}</span>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15, color: 'var(--ink)' }}>
              {title}
            </h1>
            {sub && <p style={{ margin: '8px 0 0', color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.5 }}>{sub}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function BrandPanel({ variant }: { variant: Side }) {
  const p = PALETTES[variant]
  const c = COPY[variant]
  return (
    <div
      style={{
        background: `linear-gradient(140deg, ${p.from} 0%, ${p.to} 100%)`,
        padding: 'clamp(28px, 4vw, 56px)',
        color: '#fff',
        display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}
      className="auth-brand-panel"
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(255,255,255,.16)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16,
          border: '1px solid rgba(255,255,255,.20)',
        }}>M</span>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.005em' }}>MedIntel</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.75)',
        }}>{c.kicker}</span>
        <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>
          {c.title}
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,.82)', fontSize: 14, lineHeight: 1.55, maxWidth: 360 }}>
          {c.line}
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(255,255,255,.16)',
          borderRadius: 16, padding: 14,
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          <Shield size={18} strokeWidth={2} />
          <span style={{ fontSize: 13 }}>
            <strong style={{ fontWeight: 700 }}>End-to-end encrypted.</strong> Audited by PMDC.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['NADRA-verified', 'PMDC-licensed', 'Stripe escrow'].map(s => (
            <span key={s} style={{
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,.10)', color: 'rgba(255,255,255,.92)',
              fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,255,255,.18)',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── form primitives ── */

export function Field({
  label, hint, error, children,
}: {
  label?: string
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: 'var(--red-600)' }}>{error}</span>}
    </label>
  )
}

export const FieldInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { leading?: React.ReactNode; trailing?: React.ReactNode }>(
  function FieldInput({ leading, trailing, style, ...props }, ref) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
        height: 48,
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
      }}
        onFocusCapture={e => { e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37,99,235,.14)' }}
        onBlurCapture={e => { e.currentTarget.style.boxShadow = '' }}
      >
        {leading && <span style={{ paddingLeft: 12, color: 'var(--ink-4)', display: 'inline-flex' }}>{leading}</span>}
        <input
          ref={ref}
          {...props}
          style={{
            flex: 1, height: '100%', border: 0, outline: 'none', background: 'transparent',
            padding: '0 14px', fontSize: 15, color: 'var(--ink)',
            fontFamily: 'var(--font-ui)',
            ...style,
          }}
        />
        {trailing && <span style={{ paddingRight: 12 }}>{trailing}</span>}
      </div>
    )
  }
)
