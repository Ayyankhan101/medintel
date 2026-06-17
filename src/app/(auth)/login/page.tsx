'use client'
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'
import { useI18n } from '@/lib/i18n/client'

function LoginForm() {
  const { T } = useI18n()
  const params = useSearchParams()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const medIntelCode   = params.get('code')
  const justRegistered = params.get('registered')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setLoading(false)
      setError(result.code === 'email_not_verified' ? 'UNVERIFIED' : T('auth.login.invalid'))
      return
    }
    // Look up the freshly-set session to pick the role-specific home — avoids
    // a middleware-bounce hop through /login.
    const me = await fetch('/api/me').then(r => r.ok ? r.json() : null).catch(() => null)
    const role = me?.role as 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'CLINIC_ADMIN' | undefined
    // Only honour same-origin callbackUrls — reject anything that starts with
    // // or a scheme (http/https) to prevent open-redirect phishing.
    const raw = params.get('callbackUrl')
    const safeCallback = raw && /^\/(?!\/)/.test(raw) ? raw : null
    const dest = safeCallback
              ?? (role === 'DOCTOR'       ? '/doctor/dashboard'
                : role === 'ADMIN'        ? '/admin/dashboard'
                : role === 'CLINIC_ADMIN' ? '/clinic/dashboard'
                : '/intake')
    window.location.assign(dest)
  }

  return (
    <AuthShell
      kicker={T('auth.login.kicker')}
      title={T('auth.login.title')}
      sub={T('auth.login.sub')}
    >
      {justRegistered && medIntelCode && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(16,185,129,.10)', border: '1px solid rgba(16,185,129,.30)',
          borderRadius: 14, padding: 14, fontSize: 'var(--text-sm)', color: 'var(--ink-2)',
        }}>
          <CheckCircle2 size={16} style={{ color: '#10b981', flex: 'none', marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{T('auth.login.accountCreated')}</div>
            <div>{T('auth.login.yourCode')} <strong className="mono">{medIntelCode}</strong></div>
            <div style={{ fontSize: 'var(--text-xxs)', color: 'var(--ink-3)', marginTop: 2 }}>
              {T('auth.login.saveCode')}
            </div>
          </div>
        </div>
      )}

      {error && error !== 'UNVERIFIED' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '10px 12px', fontSize: 'var(--text-sm)', color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {error === 'UNVERIFIED' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.30)',
          borderRadius: 12, padding: '12px 14px', fontSize: 'var(--text-sm)', color: 'var(--ink-2)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: 2, color: '#a16207' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{T('auth.login.notVerified')}</div>
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/resend-verification', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body:    JSON.stringify({ email }),
                })
                setError(T('auth.login.resent'))
              }}
              style={{
                marginTop: 4, background: 'transparent', border: 0,
                color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'underline',
                cursor: 'pointer', padding: 0, fontSize: 'var(--text-sm)',
              }}
            >
              {T('auth.login.resend')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={T('common.email')}>
          <FieldInput
            type="email" name="email" autoComplete="username"
            required
            placeholder={T('auth.login.emailPlaceholder')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            leading={<Mail size={16} />}
          />
        </Field>

        <Field label={T('common.password')}>
          <FieldInput
            type="password" name="password" autoComplete="current-password"
            required
            placeholder={T('auth.login.passwordPlaceholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            leading={<Lock size={16} />}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
            {T('auth.login.forgot')}
          </Link>
        </div>

        <Btn kind="primary" full disabled={loading} type="submit"
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}>
          {loading ? T('auth.login.signingIn') : T('common.signIn')}
        </Btn>
      </form>

      <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--ink-3)', margin: 0 }}>
        {T('auth.login.noAccount')}{' '}
        <Link href="/register" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
          {T('auth.login.createOne')}
        </Link>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
    <LoginForm />
  </Suspense>
}
