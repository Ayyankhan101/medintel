'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Star, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

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
      // Create appointment with doctor + triage data in one shot
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
      router.push(`/consultation/${data.appointmentId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-500 text-sm">Loading doctor details…</p>
      </div>
    )
  }

  if (error && !doctor) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      </div>
    )
  }

  if (!doctor) return null

  const rating = doctor.rating ? Number(doctor.rating).toFixed(1) : null

  return (
    <div className="max-w-lg mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Confirm Booking</h1>
        <p className="text-slate-500 text-sm mt-1">Review the details before proceeding to payment</p>
      </div>

      {/* Doctor card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-lg shrink-0">
            {doctor.specialization.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-slate-900">{doctor.specialization}</h2>
              {doctor.trustBadge && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> KYD Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              {rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-slate-700">{rating}</span>
                  {doctor.reviewCount > 0 && <span className="text-slate-400">({doctor.reviewCount})</span>}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {doctor.yearsExperience} yrs exp
              </span>
            </div>
            {doctor.bio && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{doctor.bio}</p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">Consultation fee</span>
          <span className="text-xl font-bold text-slate-900">
            PKR {Number(doctor.consultationFee).toLocaleString()}
          </span>
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm text-slate-600">
        <p className="font-medium text-slate-800">What happens next</p>
        <ol className="space-y-1.5 list-decimal list-inside">
          <li>Payment held in escrow — released only after prescription is uploaded</li>
          <li>Join the video consultation with your doctor</li>
          <li>Prescription saved to your Medical Vault automatically</li>
        </ol>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={confirmBooking}
        disabled={booking}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {booking
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
          : <>Confirm & Proceed to Payment <ArrowRight className="w-4 h-4" /></>
        }
      </button>

      <button
        onClick={() => router.back()}
        className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium rounded-xl transition-colors text-sm"
      >
        Go back
      </button>
    </div>
  )
}

export default function BookPage() {
  return <Suspense><BookingContent /></Suspense>
}
