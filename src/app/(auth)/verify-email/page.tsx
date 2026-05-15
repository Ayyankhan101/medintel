'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { AuthShell } from '@/components/design/AuthShell'

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

  const kicker = state === 'loading' ? 'Hold on'         : state === 'ok' ? 'Confirmed' : 'Action needed'
  const title  = state === 'loading' ? 'Verifying email…' : state === 'ok' ? 'Email verified' : 'Verification failed'

  return (
    <AuthShell kicker={kicker} title={title} sub={msg || undefined}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{
          width: 64, height: 64, borderRadius: 18,
          background:
            state === 'ok'   ? 'rgba(16,185,129,.12)' :
            state === 'fail' ? 'rgba(239,68,68,.10)'  :
                               'var(--bg-soft)',
          color:
            state === 'ok'   ? 'var(--emerald-500)' :
            state === 'fail' ? 'var(--red-600)'     :
                               'var(--ink-3)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {state === 'loading' && <Loader2 size={28} className="animate-spin" />}
          {state === 'ok'      && <CheckCircle2 size={32} strokeWidth={2.5} />}
          {state === 'fail'    && <XCircle size={32} strokeWidth={2.5} />}
        </span>
      </div>

      {state !== 'loading' && (
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '0 18px', height: 48, borderRadius: 14,
          background: state === 'ok' ? 'var(--blue-600)' : 'var(--bg-elev)',
          color: state === 'ok' ? '#fff' : 'var(--ink)',
          border: state === 'ok' ? 0 : '1px solid var(--border)',
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          boxShadow: state === 'ok' ? '0 8px 20px -8px rgba(37,99,235,.55)' : 'none',
        }}>
          {state === 'ok' ? 'Continue to sign in' : 'Back to sign in'}
        </Link>
      )}
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    }>
      <VerifyEmailInner />
    </Suspense>
  )
}
