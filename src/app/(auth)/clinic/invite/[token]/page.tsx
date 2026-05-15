'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { AuthShell } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const [step, setStep] = useState<string | null>(null)
  const [ok,   setOk]   = useState<{ name: string } | null>(null)

  async function accept() {
    setBusy(true); setErr(null); setStep(null)
    const r = await fetch('/api/clinic/invite/accept', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    const d = await r.json().catch(() => ({}))
    setBusy(false)
    if (r.ok) { setOk({ name: d.clinic?.name ?? 'the clinic' }); return }
    setErr(d.error ?? 'Could not accept invite')
    setStep(d.step ?? null)
  }

  if (ok) return (
    <AuthShell side="clinic" kicker="Welcome aboard" title={`Welcome to ${ok.name}`} sub="Your account is now linked to the clinic.">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        textAlign: 'center',
        background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.25)',
        borderRadius: 14, padding: 20,
      }}>
        <CheckCircle2 size={28} style={{ color: 'var(--emerald-500)' }} />
      </div>
      <Link href="/doctor/dashboard" style={{ textDecoration: 'none' }}>
        <Btn kind="primary" full trailing={<ArrowRight size={16} />}>Go to dashboard</Btn>
      </Link>
    </AuthShell>
  )

  return (
    <AuthShell
      side="clinic"
      kicker="Clinic invite"
      title="You're invited to a clinic"
      sub="Sign in with your doctor account to accept this invitation."
    >
      {err && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>{err}</span>
            {step === 'login' && (
              <button
                onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(`/clinic/invite/${token}`)}`)}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer',
                  color: 'var(--blue-700)', textDecoration: 'underline', fontSize: 13, textAlign: 'left' }}
              >
                Sign in
              </button>
            )}
            {step === 'role' && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Only DOCTOR accounts can be invited to a clinic. If you don&apos;t have one, ask the inviter to send the invite to your doctor email.
              </span>
            )}
          </div>
        </div>
      )}

      <Btn kind="primary" full onClick={accept} disabled={busy}
           leading={busy ? <Loader2 size={16} className="animate-spin" /> : null}>
        {busy ? 'Accepting…' : 'Accept invite'}
      </Btn>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', margin: 0 }}>
        Not a doctor on MedIntel yet?{' '}
        <Link href="/register/doctor" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
          Create a doctor account
        </Link>{' '}
        first, then return to this page.
      </p>
    </AuthShell>
  )
}
