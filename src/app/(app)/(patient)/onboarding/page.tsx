'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Shield, Ear, Users } from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { useI18n } from '@/lib/i18n/client'

type LangId = 'en' | 'ur' | 'ps' | 'pa' | 'sd'

const LANGS: { id: LangId; name: string; region: string; short: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'en', name: 'English', region: 'International',   short: 'EN', dir: 'ltr' },
  { id: 'ur', name: 'Urdu',    region: 'اردو · پاکستان', short: 'ا',  dir: 'rtl' },
  { id: 'ps', name: 'Pashto',  region: 'پښتو · KP',      short: 'پ',  dir: 'rtl' },
  { id: 'pa', name: 'Punjabi', region: 'پنجابی · Lahore', short: 'پ',  dir: 'rtl' },
  { id: 'sd', name: 'Sindhi',  region: 'سنڌي · Sindh',    short: 'س',  dir: 'rtl' },
]

const STEPS = ['Language', 'Phone', 'You', 'Welcome'] as const

const CITIES = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Hyderabad','Sukkur','Other']

interface Identity {
  name: string
  age: string
  sex: 'Female' | 'Male' | 'Other'
  city: string
  allergies: string
  consent: boolean
  researchConsent: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { T } = useI18n()
  const [step, setStep]   = useState(0)
  const [lang, setLang]   = useState<LangId>('ur')
  const [phone, setPhone] = useState('')
  const [otp, setOtp]     = useState('')
  const [sent, setSent]   = useState(false)
  const [data, setData]   = useState<Identity>({
    name: '', age: '', sex: 'Female', city: 'Karachi', allergies: '', consent: false, researchConsent: false,
  })

  const setField = <K extends keyof Identity>(k: K, v: Identity[K]) =>
    setData(d => ({ ...d, [k]: v }))

  const canAdvance =
      step === 0 ? !!lang
    : step === 1 ? otp.length === 6
    : step === 2 ? data.name.length > 1 && !!data.age && data.consent
    : true

  const next = async () => {
    // Persist research consent when leaving the identity step.
    if (step === 2) {
      void fetch('/api/patient/consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchConsent: data.researchConsent }),
      })
    }
    if (step < STEPS.length - 1) setStep(step + 1)
    else router.push('/intake')
  }
  const back = () => step > 0 && setStep(step - 1)

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 22,
        width: '100%', maxWidth: 640, margin: '0 auto',
        padding: '28px clamp(20px, 4vw, 56px) 64px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Stepper step={step} total={STEPS.length} labels={STEPS as unknown as string[]} />
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {T('onboarding.stepLabel').replace('{n}', String(step + 1)).replace('{total}', String(STEPS.length))}
        </span>
      </div>

      <div
        key={step}
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 24,
          boxShadow: 'var(--shadow-card)',
          padding: 32,
          animation: 'mi-fade-up 320ms var(--ease-out-quart) both',
        }}
      >
        {step === 0 && <LangStep lang={lang} onPick={setLang} />}
        {step === 1 && <PhoneStep phone={phone} setPhone={setPhone} otp={otp} setOtp={setOtp} sent={sent} sendOtp={() => setSent(true)} />}
        {step === 2 && <IdentityStep data={data} set={setField} />}
        {step === 3 && <WelcomeStep name={data.name} />}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {step > 0
          ? <Btn kind="ghost" leading={<ArrowLeft size={16} />} onClick={back}>{T('common.back')}</Btn>
          : <span />}
        <Btn
          kind="primary"
          disabled={!canAdvance}
          onClick={next}
          trailing={<ArrowRight size={16} strokeWidth={2} />}
        >
          {step === STEPS.length - 1 ? T('onboarding.startConsult') : T('common.continue')}
        </Btn>
      </div>
    </div>
  )
}

/* ───── stepper ───── */
function Stepper({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step
        const current = i === step
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: current ? 22 : 6, height: 6, borderRadius: 999,
                background: done || current ? 'var(--blue-600)' : 'var(--border-strong)',
                transition: 'width 320ms var(--ease-out-quart), background-color 320ms var(--ease-out-quart)',
              }}
            />
            {labels[i] && current && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{labels[i]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───── step 1: language ───── */
function LangStep({ lang, onPick }: { lang: LangId; onPick: (id: LangId) => void }) {
  const { T } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>
          {T('onboarding.lang.heading')}
        </h1>
        <p className="urdu" dir="rtl" style={{ margin: '8px 0 0', fontSize: 18, color: 'var(--ink-2)' }}>
          آپ گھر میں کون سی زبان بولتے ہیں؟
        </p>
        <p style={{ margin: '10px 0 0', color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.55, maxWidth: 480 }}>
          {T('onboarding.lang.sub')}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 10 }}>
        {LANGS.map(l => {
          const active = l.id === lang
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onPick(l.id)}
              className="focus-ring"
              style={{
                position: 'relative',
                background: 'var(--bg-elev)',
                color: 'var(--ink)',
                border: '1px solid ' + (active ? 'var(--blue-600)' : 'var(--border)'),
                borderRadius: 18,
                padding: 16,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 10,
                boxShadow: active
                  ? '0 0 0 4px rgba(37,99,235,.14), var(--shadow-card)'
                  : 'var(--shadow-card)',
                transform: active ? 'translateY(-1px)' : 'none',
                transition: 'all 240ms var(--ease-out-quart)',
              }}
            >
              <span style={{
                width: 44, height: 44, borderRadius: 12,
                background: active ? 'var(--blue-600)' : 'var(--bg-soft)',
                color: active ? '#fff' : 'var(--ink-2)',
                border: active ? '0' : '1px solid var(--border)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: l.id === 'en' ? 16 : 22,
                fontWeight: 600,
                fontFamily: l.id === 'en' ? 'var(--font-ui)' : 'var(--font-urdu)',
                transition: 'background-color 220ms var(--ease-out-quart), color 220ms ease',
              }}>{l.short}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{l.name}</div>
                <div
                  className={l.id === 'en' ? '' : 'urdu'}
                  dir={l.dir}
                  style={{ fontSize: l.id === 'en' ? 12 : 14, color: 'var(--ink-3)', marginTop: 2 }}
                >
                  {l.region}
                </div>
              </div>
              {active && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 22, height: 22, borderRadius: 999,
                  background: 'var(--blue-600)', color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───── step 2: phone + OTP ───── */
function PhoneStep({
  phone, setPhone, otp, setOtp, sent, sendOtp,
}: {
  phone: string; setPhone: (v: string) => void
  otp: string;   setOtp:   (v: string) => void
  sent: boolean; sendOtp:  () => void
}) {
  const { T } = useI18n()
  const onOtpChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 1)
    const next = otp.padEnd(6, ' ').split('')
    next[i] = v || ' '
    setOtp(next.join('').trimEnd())
    if (v) {
      const parent = e.target.parentElement
      const sib = parent?.children[i + 1] as HTMLInputElement | undefined
      sib?.focus?.()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>
          {T('onboarding.phone.heading')}
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.55 }}>
          {T('onboarding.phone.sub')}
        </p>
      </header>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {T('onboarding.mobileLabel')}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
          height: 52,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0 14px', height: '100%',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-soft)',
            color: 'var(--ink-2)', fontWeight: 600, fontSize: 14,
          }}>
            <span style={{ width: 22, height: 14, background: 'linear-gradient(180deg,#0e7c50 50%,#fff 50%)', borderRadius: 2 }} />
            <span className="mono">+92</span>
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))}
            placeholder="300 1234567"
            style={{
              flex: 1, height: '100%', border: 0, outline: 'none', background: 'transparent',
              padding: '0 14px', fontSize: 16, color: 'var(--ink)',
              fontFamily: 'var(--font-mono)', letterSpacing: '.02em',
            }}
          />
        </div>
      </label>

      <div style={{
        opacity: sent ? 1 : 0.45,
        pointerEvents: sent ? 'auto' : 'none',
        transition: 'opacity 320ms var(--ease-out-quart)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--ink-3)',
          letterSpacing: '.06em', textTransform: 'uppercase',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{T('onboarding.codeLabel')}</span>
          {sent && (
            <span style={{ color: 'var(--blue-700)', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
              {T('onboarding.sentTo').replace('{phone}', phone || '300 1234567')}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[i] || ''}
              onChange={e => onOtpChange(i, e)}
              className="focus-ring"
              style={{
                width: 46, height: 56,
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'var(--bg-elev)',
                fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600,
                textAlign: 'center', color: 'var(--ink)',
                outline: 'none',
              }}
            />
          ))}
        </div>
      </div>

      {!sent && <Btn kind="primary" onClick={sendOtp}>{T('onboarding.sendCode')}</Btn>}

      <div style={{
        background: 'rgba(37,99,235,.05)',
        border: '1px solid rgba(37,99,235,.15)',
        borderRadius: 14, padding: 14,
        display: 'flex', alignItems: 'flex-start', gap: 10,
        fontSize: 13, color: 'var(--ink-2)',
      }}>
        <Shield size={16} strokeWidth={2} style={{ color: 'var(--blue-600)', flex: 'none', marginTop: 1 }} />
        <span>
          {T('onboarding.ptaCompliance')}
        </span>
      </div>
    </div>
  )
}

/* ───── step 3: identity ───── */
function IdentityStep({
  data, set,
}: {
  data: Identity
  set:  <K extends keyof Identity>(k: K, v: Identity[K]) => void
}) {
  const { T } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>
          {T('onboarding.identity.heading')}
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>
          {T('onboarding.identity.sub')}
        </p>
      </header>

      <FormRow label={T('onboarding.nameLabel')}>
        <input
          value={data.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Hira Sheikh"
          style={inputStyle}
        />
      </FormRow>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormRow label={T('onboarding.ageLabel')}>
          <input
            type="number" min={0} max={120}
            value={data.age}
            onChange={e => set('age', e.target.value)}
            placeholder="32"
            style={inputStyle}
          />
        </FormRow>
        <FormRow label={T('onboarding.sexLabel')}>
          <div style={{
            display: 'flex', gap: 6, padding: 4,
            background: 'var(--bg-soft)',
            border: '1px solid var(--border)', borderRadius: 12,
          }}>
            {(['Female','Male','Other'] as const).map(s => {
              const active = data.sex === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('sex', s)}
                  className="focus-ring"
                  style={{
                    flex: 1, height: 44, border: 0, borderRadius: 9,
                    background: active ? 'var(--bg-elev)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    boxShadow: active ? '0 1px 0 rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)' : 'none',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    transition: 'all 200ms var(--ease-out-quart)',
                  }}
                >{s}</button>
              )
            })}
          </div>
        </FormRow>
      </div>

      <FormRow label={T('onboarding.cityLabel')}>
        <select
          value={data.city}
          onChange={e => set('city', e.target.value)}
          style={inputStyle}
        >
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </FormRow>

      <FormRow label={T('onboarding.allergiesLabel')}>
        <input
          value={data.allergies}
          onChange={e => set('allergies', e.target.value)}
          placeholder="Penicillin, peanuts…"
          style={inputStyle}
        />
      </FormRow>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={data.consent}
          onChange={e => set('consent', e.target.checked)}
          style={{ marginTop: 3, accentColor: 'var(--blue-600)' }}
        />
        <span>{T('onboarding.consentText')}</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={data.researchConsent}
          onChange={e => set('researchConsent', e.target.checked)}
          style={{ marginTop: 3, accentColor: 'var(--violet-600)' }}
        />
        <span>{T('onboarding.researchConsent')}</span>
      </label>
    </div>
  )
}

/* ───── step 4: welcome ───── */
function WelcomeStep({ name }: { name: string }) {
  const { T } = useI18n()
  const first = name.trim().split(' ')[0]
  const bullets = [
    { Icon: Shield, t: '' + T('nav.verified'),           s: T('onboarding.welcome.bullet1') },
    { Icon: Ear,    t: T('landing.feat.voiceTitle'),     s: T('onboarding.welcome.bullet2') },
    { Icon: Users,  t: T('landing.preview.escrow'),      s: T('onboarding.welcome.bullet3') },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
      <span style={{
        width: 72, height: 72, borderRadius: 22,
        background: 'rgba(16,185,129,.12)', color: 'var(--emerald-500)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        animation: 'mi-fade-up 360ms var(--ease-out-quart) both',
      }}>
        <Check size={32} strokeWidth={2.5} />
      </span>
      <div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' }}>
          {T('onboarding.welcome.heading').replace('{comma}', first ? ',' : '').replace('{name}', first || '')}
        </h1>
        <p style={{ margin: '10px 0 0', color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.55, maxWidth: 460 }}>
          {T('onboarding.welcome.sub')}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10, width: '100%', maxWidth: 540, marginTop: 8,
      }}>
        {bullets.map(({ Icon, t, s }) => (
          <div
            key={t}
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 16, padding: 14, textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 9,
              background: 'var(--bg-soft)', color: 'var(--blue-700)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={14} strokeWidth={2} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───── helpers ───── */
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontSize: 12, fontWeight: 600, color: 'var(--ink-3)',
        letterSpacing: '.06em', textTransform: 'uppercase',
      }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  height: 48, padding: '0 14px',
  background: 'var(--bg-elev)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  fontSize: 15, color: 'var(--ink)',
  outline: 'none', fontFamily: 'var(--font-ui)',
  width: '100%', boxSizing: 'border-box',
}
