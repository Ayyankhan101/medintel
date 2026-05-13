'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Activity, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'

const schema = z.object({
  fullName:    z.string().min(2, 'Full name required'),
  email:       z.string().email('Valid email required'),
  phone:       z.string().min(10, 'Valid phone number required'),
  password:    z.string().min(8, 'At least 8 characters'),
  cnicNumber:  z.string().length(13, 'CNIC must be exactly 13 digits').regex(/^\d+$/, 'Digits only'),
  dateOfBirth: z.string(),
})
type FormData = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"

export default function RegisterPage() {
  const router = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'PATIENT', ...data }) })
      const json = await res.json()
      if (!res.ok) { setError(typeof json.error === 'string' ? json.error : 'Registration failed'); return }
      router.push(`/login?registered=true&code=${json.medIntelCode}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-5 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-900">MedIntel</span>
      </Link>

      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            Your CNIC will be verified with NADRA
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name" error={errors.fullName?.message}>
              <input {...register('fullName')} placeholder="Muhammad Ali" className={inputCls} />
            </Field>
            <Field label="Date of Birth">
              <input {...register('dateOfBirth')} type="date" className={inputCls} />
            </Field>
          </div>
          <Field label="CNIC Number (13 digits, no dashes)" error={errors.cnicNumber?.message}>
            <input {...register('cnicNumber')} placeholder="3520212345679" maxLength={13} className={`${inputCls} font-mono tracking-widest`} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} />
            </Field>
            <Field label="Phone">
              <input {...register('phone')} type="tel" placeholder="+92 300 1234567" className={inputCls} />
            </Field>
          </div>
          <Field label="Password" error={errors.password?.message}>
            <input {...register('password')} type="password" placeholder="Min. 8 characters" className={inputCls} />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Verifying CNIC…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-sm text-slate-500 mt-2">
          Are you a doctor?{' '}
          <Link href="/register/doctor" className="text-blue-600 font-medium hover:underline">Join as a doctor</Link>
        </p>
      </div>
    </div>
  )
}
