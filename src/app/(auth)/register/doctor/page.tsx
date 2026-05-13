'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Stethoscope, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Neurology', 'Pulmonology',
  'Gastroenterology', 'Orthopedics', 'Dermatology', 'Psychiatry',
  'Pediatrics', 'Gynecology', 'ENT', 'Urology', 'Ophthalmology',
  'Endocrinology', 'Nephrology', 'Oncology', 'Emergency Medicine',
]

const schema = z.object({
  fullName:        z.string().min(2,  'Full name required'),
  email:           z.string().email('Valid email required'),
  phone:           z.string().min(10, 'Valid phone number required'),
  password:        z.string().min(8,  'At least 8 characters'),
  licenseNumber:   z.string().min(3,  'PMDC license number required'),
  specialization:  z.string().min(2,  'Pick a specialty'),
  yearsExperience: z.coerce.number().int().min(0, 'Must be a number').max(80),
  consultationFee: z.coerce.number().min(0).max(1_000_000),
  qualifications:  z.string().optional(),
  bio:             z.string().max(400, 'Keep it under 400 chars').optional(),
})
type FormData       = z.input<typeof schema>
type FormDataParsed = z.output<typeof schema>

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

export default function DoctorRegisterPage() {
  const router = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData, unknown, FormDataParsed>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormDataParsed) {
    setLoading(true); setError(null)
    try {
      const body = {
        role: 'DOCTOR' as const,
        ...data,
        qualifications: (data.qualifications ?? '')
          .split(',').map(s => s.trim()).filter(Boolean),
      }
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) { setError(typeof json.error === 'string' ? json.error : 'Registration failed'); return }
      router.push('/login?registered=doctor')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-slate-900 dark:text-slate-100">MedIntel</span>
      </Link>

      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Join as a doctor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            PMDC license verified · Stripe Connect onboarding next
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" error={errors.fullName?.message}>
              <input {...register('fullName')} placeholder="Dr. Aisha Khan" className={inputCls} />
            </Field>
            <Field label="PMDC license #" error={errors.licenseNumber?.message}>
              <input {...register('licenseNumber')} placeholder="PMDC-1234" className={inputCls} />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="you@example.com" className={inputCls} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input {...register('phone')} type="tel" placeholder="+923001234567" className={inputCls} />
            </Field>
          </div>

          <Field label="Password" error={errors.password?.message}>
            <input {...register('password')} type="password" placeholder="At least 8 characters" className={inputCls} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Specialty" error={errors.specialization?.message}>
              <select {...register('specialization')} className={inputCls} defaultValue="">
                <option value="" disabled>Pick a specialty…</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Years of experience" error={errors.yearsExperience?.message}>
              <input {...register('yearsExperience')} type="number" min={0} max={80} placeholder="10" className={inputCls} />
            </Field>
          </div>

          <Field label="Consultation fee (PKR)" error={errors.consultationFee?.message} hint="What you charge per online consultation">
            <input {...register('consultationFee')} type="number" min={0} placeholder="1500" className={inputCls} />
          </Field>

          <Field label="Qualifications" error={errors.qualifications?.message} hint="Comma-separated: MBBS, FCPS, MRCP…">
            <input {...register('qualifications')} placeholder="MBBS, FCPS" className={inputCls} />
          </Field>

          <Field label="Short bio (optional)" error={errors.bio?.message}>
            <textarea {...register('bio')} rows={3} placeholder="Tell patients about your practice…" className={inputCls} />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Create doctor account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Are you a patient?{' '}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Sign up here</Link>
        </p>
      </div>
    </div>
  )
}
