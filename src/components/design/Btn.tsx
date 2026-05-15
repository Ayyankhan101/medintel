'use client'

import * as React from 'react'

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface BtnProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  kind?:     Kind
  full?:     boolean
  leading?:  React.ReactNode
  trailing?: React.ReactNode
  children:  React.ReactNode
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  height: 'var(--h-tap, 48px)',
  padding: '0 18px',
  borderRadius: 14,
  fontSize: 14, fontWeight: 600, letterSpacing: '.005em',
  border: '1px solid transparent',
  transition: 'transform 180ms var(--ease-out-quart), background-color 220ms var(--ease-out-quart), box-shadow 220ms var(--ease-out-quart), color 220ms ease, border-color 220ms ease',
}

const kindStyles: Record<Kind, React.CSSProperties> = {
  primary: {
    background: 'var(--blue-600)', color: '#fff',
    boxShadow: '0 1px 0 rgba(255,255,255,.15) inset, 0 8px 20px -8px rgba(37,99,235,.55)',
  },
  secondary: {
    background: 'var(--bg-elev)', color: 'var(--ink)',
    borderColor: 'var(--border)',
    boxShadow: '0 1px 0 rgba(15,23,42,.02)',
  },
  ghost: {
    background: 'transparent', color: 'var(--ink-2)',
  },
  danger: {
    background: 'transparent', color: 'var(--red-600)', borderColor: 'rgba(239,68,68,.25)',
  },
}

export function Btn({ kind = 'primary', children, full, leading, trailing, disabled, style, ...rest }: BtnProps) {
  return (
    <button
      className="focus-ring"
      disabled={disabled}
      style={{
        ...baseStyle,
        ...kindStyles[kind],
        width: full ? '100%' : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={e   => (e.currentTarget.style.transform = '')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
      {...rest}
    >
      {leading}
      <span>{children}</span>
      {trailing}
    </button>
  )
}
