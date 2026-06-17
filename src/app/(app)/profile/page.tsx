'use client'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Copy, Check, Loader2, ShieldCheck, Mail, Phone, Calendar, IdCard, Trash2, Download } from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { PKR } from '@/components/design/helpers'
import { useI18n } from '@/lib/i18n/client'

interface Me {
  id:            string
  email:         string
  phone:         string | null
  name:          string | null
  role:          string
  medIntelCode:  string | null
  kycStatus:     string
  kycVerifiedAt: string | null
  createdAt:     string
  patient: { dateOfBirth: string } | null
  doctor: {
    licenseNumber:   string
    specialization:  string
    consultationFee: string | number
    yearsExperience: number
    kydStatus:       string
    trustBadge:      boolean
    stripeAccountId: string | null
  } | null
}

export default function ProfilePage() {
  const [me, setMe]         = useState<Me | null>(null)
  const [err, setErr]       = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { T } = useI18n()

  useEffect(() => {
    fetch('/api/me')
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`)
        return r.json()
      })
      .then(setMe)
      .catch(e => setErr(e.message))
  }, [])

  async function copyCode() {
    if (!me?.medIntelCode) return
    await navigator.clipboard.writeText(me.medIntelCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (err) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px' }}>
      <div style={{
        background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
        borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--red-600)',
      }}>{err}</div>
    </div>
  )
  if (!me) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink-3)' }}>
      <Loader2 size={16} className="animate-spin" /> {T('profile.loading')}
    </div>
  )

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto',
      padding: '28px clamp(16px, 4vw, 32px) 64px',
      display: 'flex', flexDirection: 'column', gap: 22,
      animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
    }}>
      <header>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {T('profile.account')}
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>{T('profile.title')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-3)' }}>{me.name ?? me.email}</p>
      </header>

      {me.medIntelCode && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,.06) 0%, rgba(34,211,238,.06) 100%)',
          border: '1px solid rgba(37,99,235,.20)',
          borderRadius: 22, padding: 20,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {T('profile.medIntelCode')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <p className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '.06em' }}>
              {me.medIntelCode}
            </p>
            <Btn kind="secondary" onClick={copyCode} leading={copied ? <Check size={14} style={{ color: 'var(--emerald-500)' }} /> : <Copy size={14} />}>
              {copied ? T('profile.copied') : T('profile.copy')}
            </Btn>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>
            {T('profile.shareCode')}
          </p>
        </div>
      )}

      <Section title={T('profile.account')}>
        <Row icon={<Mail size={14} />}     label={T('profile.email')}  value={me.email} />
        {me.phone && <Row icon={<Phone size={14} />} label={T('profile.phone')} value={me.phone} />}
        <Row icon={<IdCard size={14} />}   label={T('profile.role')}   value={me.role} />
        <Row icon={<Calendar size={14} />} label={T('profile.joined')} value={new Date(me.createdAt).toLocaleDateString('en-PK', { dateStyle: 'long' })} />
        {me.kycStatus === 'VERIFIED' && (
          <Row icon={<ShieldCheck size={14} style={{ color: 'var(--emerald-500)' }} />} label={T('profile.kyc')} value={T('profile.kyc')} />
        )}
      </Section>

      <DataExport />

      {me.patient && <ResearchConsent />}

      <DangerZone />

      {me.doctor && (
        <Section title={T('profile.practice')}>
          <Row label={T('profile.pmdc')}   value={me.doctor.licenseNumber} mono />
          <Row label={T('profile.specialty')}      value={me.doctor.specialization} />
          <Row label={T('profile.experience')}     value={`${me.doctor.yearsExperience} years`} />
          <Row label={T('profile.consultFee')}    value={PKR(Number(me.doctor.consultationFee))} mono />
          <Row label={T('profile.kydStatus')}     value={me.doctor.kydStatus} />
          <Row label={T('profile.trustBadge')}    value={me.doctor.trustBadge ? T('profile.awarded') : T('profile.notAwarded')} />
          <Row label={T('profile.stripePayouts')} value={me.doctor.stripeAccountId ? T('profile.connected') : T('profile.notConnected')} />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
      {children}
    </section>
  )
}

function Row({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
      {icon && <span style={{ flex: 'none', color: 'var(--ink-4)' }}>{icon}</span>}
      <span style={{ color: 'var(--ink-3)', minWidth: 120 }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ color: 'var(--ink)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function DataExport() {
  const { T } = useI18n()
  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{T('profile.yourData')}</h2>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
        {T('profile.exportHint')}
      </p>
      <a
        href="/api/patient/export"
        download
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 12,
          background: 'var(--bg-soft)', border: '1px solid var(--border)',
          color: 'var(--ink)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}
      >
        <Download size={14} /> {T('profile.exportBtn')}
      </a>
    </section>
  )
}

function ResearchConsent() {
  const { T } = useI18n()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/patient/consent')
      .then(r => r.ok ? r.json() : null)
      .then(d => setEnabled(d?.researchConsent ?? false))
      .catch(() => setEnabled(false))
  }, [])

  async function toggle() {
    if (enabled === null) return
    setBusy(true); setErr(null)
    const next = !enabled
    const res = await fetch('/api/patient/consent', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ researchConsent: next }),
    })
    setBusy(false)
    if (!res.ok) { setErr('Could not save'); return }
    setEnabled(next)
  }

  return (
    <section style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 20, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{T('profile.research')}</h2>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
        {T('profile.researchHint')}
      </p>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink)' }}>
        <input
          type="checkbox"
          disabled={enabled === null || busy}
          checked={enabled ?? false}
          onChange={toggle}
        />
        <span>{enabled ? T('profile.sharingYes') : T('profile.sharingNo')}</span>
      </label>
      {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--red-600)' }}>{err}</p>}
    </section>
  )
}

function DangerZone() {
  const { T } = useI18n()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState<string | null>(null)
  const matches = confirm === 'DELETE MY ACCOUNT'

  async function destroy() {
    setBusy(true); setErr(null)
    const res  = await fetch('/api/account/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ confirm }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(data.error ?? 'Could not delete account'); return }
    await signOut({ callbackUrl: '/' })
  }

  return (
    <section style={{
      background: 'rgba(239,68,68,.04)',
      border: '1px solid rgba(239,68,68,.20)',
      borderRadius: 22, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h2 style={{
        margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--red-600)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <Trash2 size={16} /> {T('profile.deleteAccount')}
      </h2>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
        {T('profile.deleteHint')}{' '}
        <code className="mono" style={{ background: 'var(--bg-soft)', padding: '1px 6px', borderRadius: 4 }}>
          DELETE MY ACCOUNT
        </code>{' '}
        to confirm.
      </p>
      <input
        type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
        placeholder="DELETE MY ACCOUNT"
        style={{
          width: '100%', padding: '10px 12px', fontSize: 13,
          borderRadius: 10, border: '1px solid rgba(239,68,68,.25)',
          background: 'var(--bg-elev)', color: 'var(--ink)',
          fontFamily: 'var(--font-mono)',
        }}
      />
      {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--red-600)' }}>{err}</p>}
      <Btn
        kind="primary"
        disabled={!matches || busy}
        onClick={destroy}
        leading={busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        style={{ background: 'var(--red-600)', boxShadow: '0 4px 12px -4px rgba(239,68,68,.55)' }}
      >
        {T('profile.deleteBtn')}
      </Btn>
    </section>
  )
}
