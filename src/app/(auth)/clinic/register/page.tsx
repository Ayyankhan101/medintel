'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { AuthShell, Field, FieldInput } from '@/components/design/AuthShell'
import { Btn } from '@/components/design/Btn'
import { useI18n } from '@/lib/i18n/client'

type Plan = 'STARTER' | 'STANDARD' | 'ENTERPRISE'

const PLAN_TAGLINES: Record<string, string> = {
  STARTER:    'clinicReg.planStarter',
  STANDARD:   'clinicReg.planStandard',
  ENTERPRISE: 'clinicReg.planEnterprise',
}

const PLANS: { id: Plan; name: string; minutes: string; price: string }[] = [
  { id: 'STARTER',    name: 'Starter',    minutes: '2,000 / mo',  price: 'PKR 25,000/mo'  },
  { id: 'STANDARD',   name: 'Standard',   minutes: '8,000 / mo',  price: 'PKR 80,000/mo'  },
  { id: 'ENTERPRISE', name: 'Enterprise', minutes: '25,000 / mo', price: 'Custom'         },
]

export default function ClinicRegisterPage() {
  const { T } = useI18n()
  const [form, setForm] = useState({
    clinicName: '',
    fullName:   '',
    email:      '',
    phone:      '+92',
    password:   '',
    plan:       'STARTER' as Plan,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState<{ slug: string } | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const r = await fetch('/api/clinic/register', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const d = await r.json().catch(() => ({}))
    setLoading(false)
    if (!r.ok) {
      const msg = typeof d.error === 'string'
        ? d.error
        : 'Signup failed. Check the form and try again.'
      setError(msg)
      return
    }
    setDone({ slug: d.slug })
  }

  if (done) return (
    <AuthShell side="clinic" kicker={T('clinicReg.successKicker')} title={T('clinicReg.successTitle')}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        textAlign: 'center',
        background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.25)',
        borderRadius: 14, padding: 20,
      }}>
        <CheckCircle2 size={28} style={{ color: 'var(--emerald-500)' }} />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
          {T('clinicReg.successSub').replace('{path}', `/c/${done.slug}`)}
        </p>
      </div>
      <Link href="/login" style={{ textDecoration: 'none' }}>
        <Btn kind="primary" full trailing={<ArrowRight size={16} />}>{T('clinicReg.continue')}</Btn>
      </Link>
    </AuthShell>
  )

  return (
    <AuthShell
      side="clinic"
      kicker={T('clinicReg.kicker')}
      title={T('clinicReg.title')}
      sub={T('clinicReg.sub')}
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

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={T('clinicReg.clinicName')}>
          <FieldInput required value={form.clinicName} onChange={e => set('clinicName', e.target.value)} placeholder="Karachi Heart Center" />
        </Field>
        <Field label={T('clinicReg.fullName')}>
          <FieldInput required value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Dr. Ayesha Khan" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={T('clinicReg.email')}>
            <FieldInput type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@clinic.pk" />
          </Field>
          <Field label={T('clinicReg.phone')}>
            <FieldInput type="tel" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 300 ..." />
          </Field>
        </div>

        <Field label={T('clinicReg.password')}>
          <FieldInput type="password" required value={form.password} onChange={e => set('password', e.target.value)} />
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{T('clinicReg.plan')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {PLANS.map(p => {
              const active = form.plan === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set('plan', p.id)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 12,
                    padding: 12,
                    cursor: 'pointer',
                    background: active ? 'rgba(13,148,136,.10)' : 'var(--bg-elev)',
                    border: `1px solid ${active ? 'rgba(13,148,136,.55)' : 'var(--border)'}`,
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-4)' }}>{p.minutes}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{p.price}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.3 }}>{T(PLAN_TAGLINES[p.id])}</p>
                </button>
              )
            })}
          </div>
        </div>

        <Btn kind="primary" full type="submit" disabled={loading}
             leading={loading ? <Loader2 size={16} className="animate-spin" /> : null}>
          {loading ? T('clinicReg.creating') : T('clinicReg.submit')}
        </Btn>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
        {T('clinicReg.hasAccount')}{' '}
        <Link href="/login" style={{ color: 'var(--blue-700)', fontWeight: 600, textDecoration: 'none' }}>{T('common.signIn')}</Link>
      </p>
    </AuthShell>
  )
}
