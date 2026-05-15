'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

function VerifyEmailInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) { setState('fail'); setMsg('No token provided.'); return }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (r.ok) { setState('ok'); setMsg('Your email is verified.') }
        else      { setState('fail'); setMsg(d.error ?? 'Verification failed.') }
      })
      .catch(() => { setState('fail'); setMsg('Network error.') })
  }, [token])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        {state === 'loading' && <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-slate-400" />}
        {state === 'ok'      && <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-600" />}
        {state === 'fail'    && <XCircle className="w-10 h-10 mx-auto mb-3 text-red-600" />}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {state === 'loading' ? 'Verifying…' : state === 'ok' ? 'Email verified' : 'Verification failed'}
        </h1>
        {msg && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{msg}</p>}
        {state === 'ok' && (
          <Link href="/login" className="inline-block mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            Continue to sign in
          </Link>
        )}
        {state === 'fail' && (
          <Link href="/login" className="inline-block mt-5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
      </div>
    }>
      <VerifyEmailInner />
    </Suspense>
  )
}
