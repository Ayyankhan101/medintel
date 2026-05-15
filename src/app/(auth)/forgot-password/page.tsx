'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ email }),
    }).catch(() => {})
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthShell
      kicker="Reset access"
      title="Forgot password"
      sub="We'll send a reset link to your email. The link expires in 1 hour."
    >
      {sent ? (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(16,185,129,.10)', border: '1px solid rgba(16,185,129,.30)',
          borderRadius: 14, padding: 14, fontSize: 13, color: 'var(--ink-2)',
        }}>
          <CheckCircle2 size={16} style={{ color: 'var(--emerald-500)', flex: 'none', marginTop: 1 }} />
          <p style={{ margin: 0 }}>
            If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>,
            a reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Email">
            <FieldInput
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              leading={<Mail size={16} />}
            />
          </Field>
          <Btn kind="primary" full type="submit" disabled={loading}
               leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Btn>
        </form>
      )}

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
        <Link href="/login" style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>Back to sign in</Link>
      </p>
    </AuthShell>
  )
}
