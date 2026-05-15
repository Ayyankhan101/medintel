'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Info, Loader2 } from 'lucide-react'
import { DoctorCard } from '@/components/triage/DoctorCard'
import { SeverityPill } from '@/components/design/badges'

interface Doctor {
  id: string
  specialization: string
  consultationFee: string | number
  yearsExperience: number
  rating: string | number | null
  reviewCount: number
  trustBadge: boolean
  bio: string | null
  user: { email: string }
}

type Sev = 'ROUTINE' | 'URGENT' | 'CRITICAL'

function DoctorListContent() {
  const router          = useRouter()
  const params          = useSearchParams()
  const triageId        = params.get('triageId') ?? ''
  const department      = params.get('dept') ?? 'General Medicine'
  const severity        = params.get('severity') as Sev | null
  const severityScore   = Number(params.get('score') ?? 4)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/doctors?department=${encodeURIComponent(department)}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDoctors(data)
        else setError('Failed to load doctors')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load doctors'); setLoading(false) })
  }, [department])

  function handleBook(doctorId: string) {
    const p = new URLSearchParams({
      doctorId,
      triageId,
      dept:     department,
      severity: severity ?? '',
      score:    String(severityScore),
    })
    router.push(`/book?${p.toString()}`)
  }

  return (
    <div style={{
      maxWidth: 760, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Pick your doctor
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            {department}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
            Showing KYD-verified specialists available today.
          </p>
        </div>
        {severity && (
          <SeverityPill level={severity === 'CRITICAL' ? 'EMERGENCY' : severity === 'URGENT' ? 'URGENT' : 'ROUTINE'} />
        )}
      </header>

      {severity === 'CRITICAL' && (
        <Banner tone="red" Icon={AlertTriangle}>
          <strong>The AI flagged this as potentially urgent.</strong> If this is a
          life-threatening emergency, call <strong>1122</strong> immediately. Otherwise,
          a trust-badged specialist is recommended — but the choice is yours.
        </Banner>
      )}
      {severity && severity !== 'CRITICAL' && (
        <Banner tone="blue" Icon={Info}>
          AI suggestion only — pick any doctor you prefer. They make the clinical decisions.
        </Banner>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              height: 124, borderRadius: 22,
              background: 'linear-gradient(90deg, var(--bg-soft) 0%, var(--bg-elev) 50%, var(--bg-soft) 100%)',
              backgroundSize: '200% 100%',
              animation: 'mi-shimmer 1.4s linear infinite',
              border: '1px solid var(--border)',
            }} />
          ))}
        </div>
      )}

      {error && (
        <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--red-600)', fontSize: 14 }}>{error}</p>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>No verified {department} specialists found yet.</p>
          <p style={{ margin: 0, color: 'var(--ink-4)', fontSize: 12 }}>Try a broader search or contact support.</p>
        </div>
      )}

      {!loading && doctors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {doctors.map(d => <DoctorCard key={d.id} doctor={d} onBook={handleBook} />)}
        </div>
      )}
    </div>
  )
}

function Banner({ tone, Icon, children }: {
  tone: 'red' | 'blue'
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  children: React.ReactNode
}) {
  const map = {
    red:  { bg: 'rgba(239,68,68,.06)',  border: 'rgba(239,68,68,.25)',  fg: 'var(--red-600)' },
    blue: { bg: 'rgba(37,99,235,.05)',  border: 'rgba(37,99,235,.20)',  fg: 'var(--blue-700)' },
  } as const
  const m = map[tone]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: 14, borderRadius: 14,
      background: m.bg, border: `1px solid ${m.border}`,
      color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.55,
    }}>
      <Icon size={18} strokeWidth={2} />
      <div>{children}</div>
    </div>
  )
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    }>
      <DoctorListContent />
    </Suspense>
  )
}
