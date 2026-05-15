'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
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
    if (password.length < 8)         return setError('Password must be at least 8 characters.')
    if (password !== confirm)        return setError('Passwords do not match.')
    if (!token)                      return setError('Missing reset token. Request a new link.')

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

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Password updated</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You can now sign in with your new password.</p>
            <Link href="/login" className="inline-block mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Set a new password</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a strong password (8+ characters).</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field icon label="New password"     value={password} onChange={setPassword} />
              <Field icon label="Confirm password" value={confirm}  onChange={setConfirm} />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { icon?: boolean; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="mt-1 relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="password"
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        />
      </div>
    </div>
  )
}
