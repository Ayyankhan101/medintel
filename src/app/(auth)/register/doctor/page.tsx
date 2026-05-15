'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { SPECIALTY_NAMES } from '@/lib/triage/specialties'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'

const SPECIALTIES = SPECIALTY_NAMES

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

const shellInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elev)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '0 14px',
  height: 48,
  fontSize: 15,
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
}

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
    <AuthShell
      side="doctor"
      kicker="Join as a doctor"
      title="Practice on MedIntel"
      sub="PMDC license verified · Stripe Connect onboarding next."
    >
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
        }}>
          <AlertCircle size={14} style={{ flex: 'none', marginTop: 2 }} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Full name" error={errors.fullName?.message}>
            <FieldInput placeholder="Dr. Aisha Khan" {...register('fullName')} />
          </Field>
          <Field label="PMDC license #" error={errors.licenseNumber?.message}>
            <FieldInput placeholder="PMDC-1234" {...register('licenseNumber')} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Email" error={errors.email?.message}>
            <FieldInput type="email" placeholder="you@example.com" {...register('email')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <FieldInput type="tel" placeholder="+923001234567" {...register('phone')} />
          </Field>
        </div>

        <Field label="Password" error={errors.password?.message}>
          <FieldInput type="password" placeholder="At least 8 characters" {...register('password')} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Specialty" error={errors.specialization?.message}>
            <select {...register('specialization')} defaultValue="" style={shellInputStyle}>
              <option value="" disabled>Pick a specialty…</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Years of experience" error={errors.yearsExperience?.message}>
            <FieldInput type="number" min={0} max={80} placeholder="10" {...register('yearsExperience')} />
          </Field>
        </div>

        <Field label="Consultation fee (PKR)" hint="What you charge per online consultation" error={errors.consultationFee?.message}>
          <FieldInput type="number" min={0} placeholder="1500" {...register('consultationFee')} />
        </Field>

        <Field label="Qualifications" hint="Comma-separated: MBBS, FCPS, MRCP…" error={errors.qualifications?.message}>
          <FieldInput placeholder="MBBS, FCPS" {...register('qualifications')} />
        </Field>

        <Field label="Short bio (optional)" error={errors.bio?.message}>
          <textarea
            {...register('bio')} rows={3}
            placeholder="Tell patients about your practice…"
            style={{ ...shellInputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }}
          />
        </Field>

        <Btn kind="primary" full type="submit" disabled={loading}
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}>
          {loading ? 'Creating account…' : 'Create doctor account'}
        </Btn>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
        Are you a patient?{' '}
        <Link href="/register" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>Sign up here</Link>
      </p>
    </AuthShell>
  )
}
