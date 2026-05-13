'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DoctorCard } from '@/components/triage/DoctorCard'
import { SeverityBadge } from '@/components/triage/SeverityBadge'

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

function DoctorListContent() {
  const router         = useRouter()
  const params         = useSearchParams()
  const triageId     = params.get('triageId') ?? ''
  const department   = params.get('dept') ?? 'General Medicine'
  const severity     = params.get('severity') as 'ROUTINE' | 'URGENT' | 'CRITICAL' | null
  const severityScore = Number(params.get('score') ?? 4)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // Always show every verified specialist — never auto-filter on AI severity.
    // The AI's suggestion is highlighted but the patient picks who they want.
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
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{department} Doctors</h1>
          <p className="text-sm text-gray-500">Showing KYD-verified specialists</p>
        </div>
        {severity && <SeverityBadge score={severityScore} level={severity} />}
      </div>

      {severity === 'CRITICAL' && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-3 rounded text-sm">
          <p className="font-medium">⚠️ The AI flagged this as potentially urgent.</p>
          <p className="mt-0.5">If this is a life-threatening emergency, call <strong>1122</strong> immediately. Otherwise, picking a trust-badged specialist is recommended — but the choice is yours.</p>
        </div>
      )}
      {severity && severity !== 'CRITICAL' && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 p-3 rounded text-sm">
          AI suggestion only — pick any doctor you prefer. They make the clinical decisions.
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-center py-4">{error}</p>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div className="text-center py-8 space-y-2">
          <p className="text-gray-500">No verified {department} specialists found yet.</p>
          <p className="text-sm text-gray-400">Try a broader search or contact support.</p>
        </div>
      )}

      {!loading && doctors.length > 0 && (
        <div className="space-y-3">
          {doctors.map(d => (
            <DoctorCard key={d.id} doctor={d} onBook={handleBook} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DoctorsPage() {
  return (
    <Suspense>
      <DoctorListContent />
    </Suspense>
  )
}
