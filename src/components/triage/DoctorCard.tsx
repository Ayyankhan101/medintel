'use client'

import Link from 'next/link'
import { Star, ShieldCheck, Clock, ArrowRight } from 'lucide-react'
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

interface Props { doctor: Doctor; onBook: (id: string) => void }

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #b45309 100%)',
  'linear-gradient(135deg, #60a5fa 0%, #2563eb 60%, #1e3a8a 100%)',
  'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 60%, #6d28d9 100%)',
  'linear-gradient(135deg, #34d399 0%, #10b981 60%, #047857 100%)',
]

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'DR'
  const grad = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
  return (
    <span style={{
      width: 56, height: 56, borderRadius: 18,
      background: grad, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, fontWeight: 700, letterSpacing: '.02em',
      flex: 'none',
      boxShadow: '0 4px 12px -4px rgba(15,23,42,.20)',
    }}>{initials}</span>
  )
}

export function DoctorCard({ doctor, onBook }: Props) {
  const rating = doctor.rating != null ? Number(doctor.rating).toFixed(1) : null
  return (
    <div
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
        borderRadius: 22, padding: 20,
        boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'transform 240ms var(--ease-out-quart), box-shadow 240ms var(--ease-out-quart), border-color 240ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,.30)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Avatar name={doctor.specialization} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.005em' }}>
                  {doctor.specialization}
                </h3>
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
                {rating ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
                    <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{rating}</span>
                    {doctor.reviewCount > 0 && <span style={{ color: 'var(--ink-4)' }}>({doctor.reviewCount})</span>}
                  </span>
                ) : (
                  <span style={{
                    padding: '2px 8px', borderRadius: 999,
                    background: 'var(--bg-soft)', color: 'var(--ink-3)',
                    fontSize: 10, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
                  }}>New</span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  {doctor.yearsExperience} yrs
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em', lineHeight: 1 }}>
                {PKR(Number(doctor.consultationFee))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>per session</div>
            </div>
          </div>

          {doctor.bio && (
            <p style={{
              margin: '10px 0 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{doctor.bio}</p>
          )}
        </div>
      </div>

      <div style={{
        paddingTop: 14, borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <Link
          href={`/doctors/${doctor.id}`}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textDecoration: 'none' }}
        >
          View profile →
        </Link>
        <Btn kind="primary"
             onClick={() => onBook(doctor.id)}
             trailing={<ArrowRight size={14} strokeWidth={2.5} />}>
          Book now
        </Btn>
      </div>
    </div>
  )
}
