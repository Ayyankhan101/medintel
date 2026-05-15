'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const params = useSearchParams()
  const token  = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [done,     setDone]     = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8)  return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    if (!token)               return setError('Missing reset token. Request a new link.')

    setLoading(true)
    const r = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (r.ok) { setDone(true); return }
    const d = await r.json().catch(() => ({}))
    setError(d.error ?? 'Reset failed.')
  }

  if (done) {
    return (
      <AuthShell kicker="Done" title="Password updated" sub="You can now sign in with your new password.">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <span style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(16,185,129,.12)', color: 'var(--emerald-500)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={28} strokeWidth={2.5} />
          </span>
        </div>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '0 18px', height: 48, borderRadius: 14,
          background: 'var(--blue-600)', color: '#fff',
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 8px 20px -8px rgba(37,99,235,.55)',
        }}>
          Continue to sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell kicker="Reset access" title="Set a new password" sub="Choose a strong password (8+ characters).">
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="New password">
          <FieldInput type="password" required value={password}
                      onChange={e => setPassword(e.target.value)}
                      leading={<Lock size={16} />} />
        </Field>
        <Field label="Confirm password">
          <FieldInput type="password" required value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      leading={<Lock size={16} />} />
        </Field>
        {error && (
          <p style={{
            margin: 0, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
            fontSize: 13, color: 'var(--red-600)',
          }}>{error}</p>
        )}
        <Btn kind="primary" full type="submit" disabled={loading}
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}>
          {loading ? 'Updating…' : 'Update password'}
        </Btn>
      </form>
    </AuthShell>
  )
}
