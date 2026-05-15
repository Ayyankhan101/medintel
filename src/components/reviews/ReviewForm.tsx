'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'

export function ReviewForm({
  appointmentId,
  onSubmitted,
}: {
  appointmentId: string
  onSubmitted:   (rating: number) => void
}) {
  const [rating, setRating]   = useState(0)
  const [hover, setHover]     = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Please select a star rating.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId, rating, comment: comment.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? 'Could not save review'); return }
      onSubmitted(rating)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">How was this consultation?</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => {
          const active = (hover || rating) >= n
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-0.5"
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
            >
              <Star className={`w-5 h-5 transition-colors ${active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </button>
          )
        })}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Optional comment (max 2000 chars)"
        maxLength={2000}
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !rating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />} Submit review
        </button>
      </div>
    </form>
  )
}
