'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)
  const [step,    setStep]    = useState<string | null>(null)
  const [ok,      setOk]      = useState<{ name: string } | null>(null)

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

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        {ok ? (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-600" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Welcome to {ok.name}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your account is now linked to the clinic.</p>
            <Link href="/doctor/dashboard" className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Go to dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 mx-auto flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">You're invited to a clinic</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sign in with your doctor account to accept this invitation.
            </p>

            {err && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  {err}
                  {step === 'login' && (
                    <button
                      onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(`/clinic/invite/${token}`)}`)}
                      className="block mt-2 text-blue-700 underline"
                    >
                      Sign in
                    </button>
                  )}
                  {step === 'role' && (
                    <p className="mt-2 text-xs">Only DOCTOR accounts can be invited to a clinic. If you don't have one, ask the inviter to send the invite to your doctor email.</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={accept}
              disabled={busy}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Accept invite
            </button>

            <p className="mt-4 text-xs text-slate-400">
              Not a doctor on MedIntel yet? <Link href="/register/doctor" className="underline">Create a doctor account</Link> first, then return to this page.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
