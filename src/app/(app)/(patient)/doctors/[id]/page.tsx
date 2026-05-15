'use client'
import { use, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Star, ShieldCheck, Clock, GraduationCap, Loader2,
  Stethoscope, CheckCircle2,
} from 'lucide-react'

interface Doctor {
  id:              string
  specialization:  string
  consultationFee: string | number
  yearsExperience: number
  qualifications:  string[]
  bio:             string | null
  rating:          string | number | null
  reviewCount:     number
  trustBadge:      boolean
  user:            { name: string | null; email: string }
}

interface ReviewRow {
  id:        string
  rating:    number
  comment:   string | null
  createdAt: string
  author:    string
}

function ProfileInner({ id }: { id: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [doctor,  setDoctor]  = useState<Doctor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [reviews, setReviews]         = useState<ReviewRow[]>([])
  const [revLoading, setRevLoading]   = useState(true)
  const [nextCursor, setNextCursor]   = useState<string | null>(null)
  const [moreBusy, setMoreBusy]       = useState(false)

  useEffect(() => {
    fetch(`/api/doctors/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Not found')
        return r.json()
      })
      .then(setDoctor)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))

    fetch(`/api/doctors/${id}/reviews?limit=10`)
      .then(r => r.ok ? r.json() : { reviews: [], nextCursor: null })
      .then(d => { setReviews(d.reviews ?? []); setNextCursor(d.nextCursor ?? null) })
      .finally(() => setRevLoading(false))
  }, [id])

  async function loadMore() {
    if (!nextCursor || moreBusy) return
    setMoreBusy(true)
    try {
      const res = await fetch(`/api/doctors/${id}/reviews?limit=10&cursor=${encodeURIComponent(nextCursor)}`)
      if (!res.ok) return
      const d = await res.json()
      setReviews(prev => [...prev, ...(d.reviews ?? [])])
      setNextCursor(d.nextCursor ?? null)
    } finally { setMoreBusy(false) }
  }

  function handleBook() {
    const q = new URLSearchParams({
      doctorId: id,
      triageId: params.get('triageId') ?? '',
      dept:     params.get('dept')     ?? '',
      severity: params.get('severity') ?? '',
      score:    params.get('score')    ?? '',
    })
    router.push(`/book?${q.toString()}`)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex items-center gap-2 text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading profile…
    </div>
  )
  if (error || !doctor) return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <p className="text-sm text-red-600">{error ?? 'Doctor not found.'}</p>
      <Link href="/doctors" className="text-sm text-blue-600 hover:underline mt-3 inline-block">Back to list</Link>
    </div>
  )

  const rating  = doctor.rating ? Number(doctor.rating).toFixed(1) : null
  const name    = doctor.user.name ?? 'Doctor'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Stethoscope className="w-9 h-9 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{name}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{doctor.specialization}</p>
                <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                  {rating && (
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{rating}</span>
                      {doctor.reviewCount > 0 && <span className="text-slate-400">({doctor.reviewCount} reviews)</span>}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {doctor.yearsExperience} years experience
                  </span>
                  {doctor.trustBadge && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-2 py-0.5 rounded-full font-medium">
                      <ShieldCheck className="w-3 h-3" /> KYD Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">PKR {Number(doctor.consultationFee).toLocaleString()}</p>
                <p className="text-xs text-slate-500">per consultation</p>
              </div>
            </div>
          </div>
        </div>

        {doctor.bio && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">About</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line">{doctor.bio}</p>
          </div>
        )}

        {doctor.qualifications?.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" /> Qualifications
            </h2>
            <ul className="space-y-1.5">
              {doctor.qualifications.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleBook}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Book consultation — PKR {Number(doctor.consultationFee).toLocaleString()}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          Patient reviews
          {doctor.reviewCount > 0 && (
            <span className="text-xs font-normal text-slate-500">({doctor.reviewCount})</span>
          )}
        </h2>
        {revLoading ? (
          <p className="text-xs text-slate-400">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet. Be the first after your consultation.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map(r => (
              <li key={r.id} className="border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  ))}
                  <span className="text-xs text-slate-500">
                    {r.author} · {new Date(r.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {nextCursor && (
          <button
            onClick={loadMore}
            disabled={moreBusy}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {moreBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Load more reviews
          </button>
        )}
      </section>
    </div>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <ProfileInner id={id} />
    </Suspense>
  )
}
