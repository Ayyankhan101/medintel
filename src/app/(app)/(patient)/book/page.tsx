'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Star, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { PKR } from '@/components/design/helpers'

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

function BookingContent() {
  const router   = useRouter()
  const params   = useSearchParams()
  const doctorId = params.get('doctorId') ?? ''
  const triageId = params.get('triageId') ?? ''

  const [doctor,  setDoctor]  = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!doctorId) { setError('No doctor selected'); setLoading(false); return }
    fetch(`/api/doctors/${doctorId}`)
      .then(r => r.json())
      .then(data => { setDoctor(data); setLoading(false) })
      .catch(() => { setError('Could not load doctor details'); setLoading(false) })
  }, [doctorId])

  async function confirmBooking() {
    if (!doctorId) { setError('No doctor selected'); return }
    setBooking(true); setError(null)
    try {
      const res = await fetch('/api/appointments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          scheduledAt: new Date().toISOString(),
          doctorId,
          ...(triageId ? { triageId } : {}),
        }),
      })
      const raw  = await res.text()
      const data = raw ? JSON.parse(raw) : {}
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')
      router.push(`/booking/${data.appointmentId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--blue-600)' }} />
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>Loading doctor details…</p>
      </div>
    )
  }

  if (error && !doctor) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px clamp(16px, 4vw, 32px)' }}>
        <ErrorBanner>{error}</ErrorBanner>
      </div>
    )
  }
  if (!doctor) return null

  const rating = doctor.rating != null ? Number(doctor.rating).toFixed(1) : null

  return (
    <div style={{
      maxWidth: 560, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 18,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Confirm booking
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          Review and proceed
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
          Check details before payment.
        </p>
      </header>

      <div style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{
            width: 56, height: 56, borderRadius: 18,
            background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 60%, #1e3a8a 100%)',
            color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flex: 'none',
            boxShadow: '0 4px 12px -4px rgba(15,23,42,.20)',
          }}>{doctor.specialization.slice(0, 2).toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{doctor.specialization}</h2>
              {doctor.trustBadge && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(13,148,136,.10)', color: '#0f766e',
                  border: '1px solid rgba(13,148,136,.22)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
                }}>
                  <ShieldCheck size={10} strokeWidth={2.5} /> KYD VERIFIED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
              {rating && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
                  <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{rating}</span>
                  {doctor.reviewCount > 0 && <span style={{ color: 'var(--ink-4)' }}>({doctor.reviewCount})</span>}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {doctor.yearsExperience} yrs exp
              </span>
            </div>
            {doctor.bio && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{doctor.bio}</p>
            )}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Consultation fee</span>
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>
            {PKR(Number(doctor.consultationFee))}
          </span>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-soft)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 16,
        fontSize: 13, color: 'var(--ink-2)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>What happens next</span>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.5 }}>
          <li>Payment held in escrow — released only after prescription is uploaded</li>
          <li>Join the video consultation with your doctor</li>
          <li>Prescription saved to your Medical Vault automatically</li>
        </ol>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Btn kind="primary" full
           disabled={booking}
           onClick={confirmBooking}
           leading={booking ? <Loader2 size={16} className="animate-spin" /> : null}
           trailing={booking ? null : <ArrowRight size={16} strokeWidth={2} />}>
        {booking ? 'Confirming…' : 'Confirm & proceed to payment'}
      </Btn>

      <Btn kind="secondary" full onClick={() => router.back()}>
        Go back
      </Btn>
    </div>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
      borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
    }}>
      <AlertCircle size={14} style={{ flex: 'none' }} /> {children}
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    }>
      <BookingContent />
    </Suspense>
  )
}
