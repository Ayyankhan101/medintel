'use client'
import { ResourceFinder } from '@/components/resources/ResourceFinder'
import { MapPin } from 'lucide-react'

export default function ResourcesPage() {
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Nearby help
        </span>
        <h1 style={{
          margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)',
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}>
          <MapPin size={22} style={{ color: 'var(--blue-700)' }} /> Medical resources
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Find the nearest hospitals, pharmacies, oxygen cylinders, and emergency equipment near you.
        </p>
      </header>
      <ResourceFinder />
    </div>
  )
}
