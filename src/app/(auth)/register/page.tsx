'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'

const schema = z.object({
  fullName:    z.string().min(2, 'Full name required'),
  email:       z.string().email('Valid email required'),
  phone:       z.string().min(10, 'Valid phone number required'),
  password:    z.string().min(8, 'At least 8 characters'),
  cnicNumber:  z.string().length(13, 'CNIC must be exactly 13 digits').regex(/^\d+$/, 'Digits only'),
  dateOfBirth: z.string(),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'PATIENT', ...data }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Registration failed')
        return
      }
      router.push(`/login?registered=true&code=${json.medIntelCode}`)
    } finally { setLoading(false) }
  }

  return (
    <AuthShell
      kicker="Get started"
      title="Create your account"
      sub="Your CNIC will be verified with NADRA. Takes about a minute."
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
          <Field label="Full Name" error={errors.fullName?.message}>
            <FieldInput placeholder="Muhammad Ali" {...register('fullName')} />
          </Field>
          <Field label="Date of Birth">
            <FieldInput type="date" {...register('dateOfBirth')} />
          </Field>
        </div>

        <Field
          label="CNIC Number"
          hint="13 digits, no dashes"
          error={errors.cnicNumber?.message}
        >
          <FieldInput
            placeholder="3520212345679"
            maxLength={13}
            className="mono"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}
            {...register('cnicNumber')}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Email" error={errors.email?.message}>
            <FieldInput type="email" placeholder="you@example.com" {...register('email')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <FieldInput type="tel" placeholder="+92 300 1234567" {...register('phone')} />
          </Field>
        </div>

        <Field label="Password" error={errors.password?.message}>
          <FieldInput type="password" placeholder="Min. 8 characters" {...register('password')} />
        </Field>

        <Btn kind="primary" full type="submit" disabled={loading}
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}>
          {loading ? 'Verifying CNIC…' : 'Create account'}
        </Btn>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <span>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </span>
        <span>
          Are you a doctor?{' '}
          <Link href="/register/doctor" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>Join as a doctor</Link>
        </span>
      </div>
    </AuthShell>
  )
}
