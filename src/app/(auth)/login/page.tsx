'use client'
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'

function LoginForm() {
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
      setError(result.error.includes('EMAIL_NOT_VERIFIED') ? 'UNVERIFIED' : 'Invalid email or password')
      return
    }
    window.location.assign('/login')
  }

  return (
    <AuthShell
      kicker="Welcome back"
      title="Sign in to MedIntel"
      sub="Use the email and password from your account."
    >
      {justRegistered && medIntelCode && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(16,185,129,.10)', border: '1px solid rgba(16,185,129,.30)',
          borderRadius: 14, padding: 14, fontSize: 13, color: 'var(--ink-2)',
        }}>
          <CheckCircle2 size={16} style={{ color: '#10b981', flex: 'none', marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Account created!</div>
            <div>Your MedIntel Code: <strong className="mono">{medIntelCode}</strong></div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
              Save this — it links your entire medical history.
            </div>
          </div>
        </div>
      )}

      {error && error !== 'UNVERIFIED' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {error === 'UNVERIFIED' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.30)',
          borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--ink-2)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: 2, color: '#a16207' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Email not verified yet.</div>
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/resend-verification', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body:    JSON.stringify({ email }),
                })
                setError('Verification email resent. Check your inbox.')
              }}
              style={{
                marginTop: 4, background: 'transparent', border: 0,
                color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'underline',
                cursor: 'pointer', padding: 0, fontSize: 13,
              }}
            >
              Resend verification email
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Email">
          <FieldInput
            type="email" name="email" autoComplete="username"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leading={<Mail size={16} />}
          />
        </Field>

        <Field label="Password">
          <FieldInput
            type="password" name="password" autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            leading={<Lock size={16} />}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        <Btn kind="primary" full disabled={loading} type="submit"
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Btn>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
        No account?{' '}
        <Link href="/register" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>
          Create one
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
