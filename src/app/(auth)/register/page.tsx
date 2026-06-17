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
import { useI18n } from '@/lib/i18n/client'

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
  const { T } = useI18n()
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
      kicker={T('auth.register.kicker')}
      title={T('auth.register.title')}
      sub={T('auth.register.sub')}
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
          <Field label={T('auth.register.fullName')} error={errors.fullName?.message}>
            <FieldInput placeholder={T('auth.register.namePlaceholder')} {...register('fullName')} />
          </Field>
          <Field label={T('auth.register.dob')}>
            <FieldInput type="date" {...register('dateOfBirth')} />
          </Field>
        </div>

        <Field
          label={T('auth.register.cnic')}
          hint={T('auth.register.cnicHint')}
          error={errors.cnicNumber?.message}
        >
          <FieldInput
            placeholder={T('auth.register.cnicPlaceholder')}
            maxLength={13}
            className="mono"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}
            {...register('cnicNumber')}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={T('common.email')} error={errors.email?.message}>
            <FieldInput type="email" placeholder={T('common.emailPlaceholder')} {...register('email')} />
          </Field>
          <Field label={T('common.phone')} error={errors.phone?.message}>
            <FieldInput type="tel" placeholder={T('auth.register.phonePlaceholder')} {...register('phone')} />
          </Field>
        </div>

        <Field label={T('common.password')} error={errors.password?.message}>
          <FieldInput type="password" placeholder={T('auth.register.passwordHint')} {...register('password')} />
        </Field>

        <Btn kind="primary" full type="submit" disabled={loading}
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}>
          {loading ? T('auth.register.verifying') : T('auth.register.submit')}
        </Btn>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <span>
          {T('auth.register.hasAccount')}{' '}
          <Link href="/login" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>{T('common.signIn')}</Link>
        </span>
        <span>
          {T('auth.register.areDoctor')}{' '}
          <Link href="/register/doctor" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>{T('auth.register.joinDoctor')}</Link>
        </span>
      </div>
    </AuthShell>
  )
}
