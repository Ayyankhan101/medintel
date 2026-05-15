'use client'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { Copy, Check, Loader2, ShieldCheck, Mail, Phone, Calendar, IdCard, Trash2 } from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { PKR } from '@/components/design/helpers'

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
      <Loader2 size={16} className="animate-spin" /> Loading…
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
          Account
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>Profile</h1>
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
            Your MedIntel patient code
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <p className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '.06em' }}>
              {me.medIntelCode}
            </p>
            <Btn kind="secondary" onClick={copyCode} leading={copied ? <Check size={14} style={{ color: 'var(--emerald-500)' }} /> : <Copy size={14} />}>
              {copied ? 'Copied' : 'Copy'}
            </Btn>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>
            Share this with any doctor or hospital to give them access to your records.
          </p>
        </div>
      )}

      <Section title="Account">
        <Row icon={<Mail size={14} />}     label="Email"  value={me.email} />
        {me.phone && <Row icon={<Phone size={14} />} label="Phone" value={me.phone} />}
        <Row icon={<IdCard size={14} />}   label="Role"   value={me.role} />
        <Row icon={<Calendar size={14} />} label="Joined" value={new Date(me.createdAt).toLocaleDateString('en-PK', { dateStyle: 'long' })} />
        {me.kycStatus === 'VERIFIED' && (
          <Row icon={<ShieldCheck size={14} style={{ color: 'var(--emerald-500)' }} />} label="KYC" value="Verified" />
        )}
      </Section>

      <DangerZone />

      {me.doctor && (
        <Section title="Practice">
          <Row label="PMDC license"   value={me.doctor.licenseNumber} mono />
          <Row label="Specialty"      value={me.doctor.specialization} />
          <Row label="Experience"     value={`${me.doctor.yearsExperience} years`} />
          <Row label="Consult fee"    value={PKR(Number(me.doctor.consultationFee))} mono />
          <Row label="KYD status"     value={me.doctor.kydStatus} />
          <Row label="Trust badge"    value={me.doctor.trustBadge ? 'Awarded' : 'Not awarded'} />
          <Row label="Stripe payouts" value={me.doctor.stripeAccountId ? 'Connected' : 'Not connected'} />
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

function DangerZone() {
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
        <Trash2 size={16} /> Delete account
      </h2>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
        Permanently deletes your personal information. Prescriptions, audit logs, and other regulated
        medical records are retained as required by PMDC and the Drugs Act 1976. Type{' '}
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
        Delete my account
      </Btn>
    </section>
  )
}
