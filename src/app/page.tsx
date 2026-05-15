'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Check, Mic, Shield, ShieldCheck, Wifi, Users, Phone,
  CreditCard, Activity,
} from 'lucide-react'
import { Btn } from '@/components/design/Btn'
import { VerifiedBadge } from '@/components/design/badges'
import { PKR } from '@/components/design/helpers'

type NavTarget = 'intake' | 'register-doctor' | 'register' | 'login' | 'legal-terms' | 'legal-privacy' | 'legal-pmdc'

export default function HomePage() {
  const router = useRouter()
  const go = (target: NavTarget) => {
    const map: Record<NavTarget, string> = {
      'intake':           '/intake',
      'register-doctor':  '/register/doctor',
      'register':         '/register',
      'login':            '/login',
      'legal-terms':      '/legal/terms',
      'legal-privacy':    '/legal/privacy',
      'legal-pmdc':       '/legal/pmdc',
    }
    router.push(map[target])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TopNav onSignIn={() => go('login')} onCta={() => go('register')} />
      <Hero onCta={() => go('intake')} onSecondary={() => go('register-doctor')} />
      <StatsBand />
      <FeatureGrid />
      <HowItWorks />
      <ComplianceSection />
      <FooterCta onCta={() => go('intake')} />
      <Footer onNav={go} />
    </div>
  )
}

/* ───── top nav ───── */
function TopNav({ onSignIn, onCta }: { onSignIn: () => void; onCta: () => void }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
      padding: '10px clamp(20px, 4vw, 56px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
    }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--ink)', textDecoration: 'none' }}>
        <span style={{
          width: 28, height: 28, borderRadius: 9,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, var(--blue-500), var(--blue-700))',
          color: '#fff', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px -4px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.25)',
        }}>M</span>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.005em' }}>MedIntel</span>
      </Link>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={onSignIn} className="focus-ring"
          style={{ background: 'transparent', border: 0, color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '8px 12px' }}>
          Sign in
        </button>
        <button onClick={onCta} className="focus-ring"
          style={{
            background: 'var(--blue-600)', color: '#fff', border: 0,
            padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px -4px rgba(37,99,235,.45)',
          }}>
          Get started
        </button>
      </div>
    </header>
  )
}

/* ───── hero ───── */
function Hero({ onCta, onSecondary }: { onCta: () => void; onSecondary: () => void }) {
  return (
    <section style={{
      position: 'relative',
      padding: 'clamp(40px, 6vw, 80px) clamp(20px, 4vw, 56px) clamp(48px, 6vw, 96px)',
      background:
        'radial-gradient(1200px 600px at 50% -10%, rgba(37,99,235,.12), transparent 60%), ' +
        'radial-gradient(800px 500px at 90% 110%, rgba(139,92,246,.10), transparent 60%)',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: 36 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 12px 5px 6px', borderRadius: 999,
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--ink-2)', fontWeight: 600,
            boxShadow: 'var(--shadow-card)',
            animation: 'mi-fade-up 360ms var(--ease-out-quart) 0ms both',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 999,
              background: 'linear-gradient(135deg, var(--blue-500), var(--violet-500))',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>✦</span>
            <span>New · PMDC-licensed telemedicine for Pakistan</span>
          </span>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.05,
            maxWidth: 920,
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 80ms both',
          }}>
            Talk to a doctor in your language.
            <br />
            <span style={{
              background: 'linear-gradient(90deg, var(--blue-600), var(--violet-500))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>Paid only when they help.</span>
          </h1>

          <p style={{
            margin: 0, maxWidth: 620, fontSize: 18,
            color: 'var(--ink-2)', lineHeight: 1.5,
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 180ms both',
          }}>
            MedIntel is voice-first telemedicine built for Pakistan. Describe your symptoms
            in Urdu, Pashto, Punjabi, Sindhi, or English. A PMDC-licensed doctor sees you in
            minutes. Fees are held in escrow until a prescription is issued.
          </p>

          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 280ms both',
          }}>
            <Btn kind="primary" onClick={onCta} trailing={<ArrowRight size={16} strokeWidth={2} />}>
              Start a consult
            </Btn>
            <Btn kind="secondary" onClick={onSecondary}>I&apos;m a doctor</Btn>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: 12,
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 380ms both',
          }}>
            <VerifiedBadge tier={3} compact />
            <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Shield size={13} strokeWidth={2} /> E2E encrypted
            </span>
            <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span>Audited by PMDC under Telemedicine Guidelines 2022</span>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}

function HeroPreview() {
  const langs: [string, string][] = [['English', 'EN'], ['اردو', 'UR'], ['پښتو', 'PS'], ['پنجابی', 'PA'], ['سنڌي', 'SD']]
  return (
    <div style={{
      position: 'relative', margin: '0 auto', maxWidth: 1080, width: '100%',
      animation: 'mi-fade-up 600ms var(--ease-out-quart) 460ms both',
    }}>
      <div style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 24, boxShadow: '0 30px 80px -30px rgba(15,23,42,.40), var(--shadow-card)',
        padding: 22,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)',
          gap: 18, alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <button aria-hidden style={{
              width: 96, height: 96, borderRadius: 999, border: 0,
              background: 'linear-gradient(180deg, var(--blue-500), var(--blue-700))',
              color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              animation: 'mi-pulse-ring 1.8s ease-out infinite',
              boxShadow: '0 12px 28px -8px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.25)',
            }}>
              <Mic size={40} />
            </button>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Tap and describe how you feel</div>
            <div style={{
              display: 'flex', gap: 8, padding: 4,
              background: 'var(--bg-soft)', border: '1px solid var(--border)',
              borderRadius: 999, flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {langs.map(([n, c], i) => (
                <span key={c} className={c === 'EN' ? '' : 'urdu'} style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: i === 1 ? 'var(--bg-elev)' : 'transparent',
                  fontSize: c === 'EN' ? 12 : 14,
                  fontWeight: 600,
                  color: i === 1 ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: i === 1 ? '0 1px 0 rgba(15,23,42,.06)' : 'none',
                }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PreviewLine label="AI triage" sub="Lower-back pain · 3-day duration" tone="violet" />
            <PreviewLine label="Severity"  sub="Routine · GP suggested" tone="emerald" />
            <PreviewLine label="Match"     sub="Dr. Ayesha Khan · in 12 min" tone="blue" />
            <PreviewLine label="Escrow"    sub={`${PKR(600)} held until Rx issued`} tone="amber" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewLine({ label, sub, tone }: { label: string; sub: string; tone: 'violet'|'emerald'|'blue'|'amber' }) {
  const map = {
    violet: { fg: 'var(--violet-600)', bg: 'rgba(139,92,246,.10)' },
    emerald:{ fg: '#047857',           bg: 'rgba(16,185,129,.10)' },
    blue:   { fg: 'var(--blue-700)',   bg: 'rgba(37,99,235,.10)' },
    amber:  { fg: '#a16207',           bg: 'rgba(245,158,11,.12)' },
  } as const
  const m = map[tone]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto',
      gap: 12, alignItems: 'center',
      padding: 12, borderRadius: 12,
      border: '1px solid var(--border)', background: 'var(--bg-soft)',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
        color: m.fg, padding: '2px 8px', borderRadius: 999, background: m.bg,
      }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{sub}</span>
      <Check size={14} strokeWidth={2.5} style={{ color: m.fg }} />
    </div>
  )
}

/* ───── stats band ───── */
function StatsBand() {
  const stats: [string, string, string][] = [
    ['142,000+', 'Consults completed',    'last 12 months'],
    ['1,284',    'PMDC-licensed doctors', 'verified quarterly'],
    ['9m 12s',   'Median wait time',      'patient → doctor'],
    ['71',       'Net promoter score',    'patients · 30-day'],
  ]
  return (
    <section style={{ padding: '48px clamp(20px, 4vw, 56px)' }}>
      <div style={{
        maxWidth: 1180, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 36, justifyItems: 'start',
      }}>
        {stats.map(([v, l, s]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="mono" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>{v}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{l}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───── features ───── */
type Accent = 'blue' | 'violet' | 'amber' | 'emerald'
const ACCENT_MAP: Record<Accent, { fg: string; bg: string }> = {
  blue:    { fg: 'var(--blue-700)',   bg: 'rgba(37,99,235,.10)' },
  violet:  { fg: 'var(--violet-600)', bg: 'rgba(139,92,246,.10)' },
  amber:   { fg: '#a16207',           bg: 'rgba(245,158,11,.12)' },
  emerald: { fg: '#047857',           bg: 'rgba(16,185,129,.10)' },
}

type IconCmp = React.ComponentType<{ size?: number; strokeWidth?: number }>

function FeatureGrid() {
  const feats: { kicker: string; accent: Accent; title: string; sub: string; Icon: IconCmp }[] = [
    { kicker: 'Voice-first',   accent: 'blue',    title: 'Describe symptoms in five languages',         sub: 'Urdu, Pashto, Punjabi, Sindhi, English. Live translation for the doctor.',                 Icon: Mic         },
    { kicker: 'AI triage',     accent: 'violet',  title: 'Severity ranked before you wait',             sub: 'An AI clinical scribe pre-reads symptoms so the right doctor sees you faster.',           Icon: Activity    },
    { kicker: 'Escrow',        accent: 'amber',   title: 'Pay only when you receive care',              sub: 'Funds are held in escrow until a prescription is issued. Refunds for no-shows.',          Icon: CreditCard  },
    { kicker: 'PMDC-verified', accent: 'emerald', title: 'Every doctor is licensed — every quarter',    sub: 'We re-verify against the PMDC register every 90 days. No expired licenses.',              Icon: ShieldCheck },
    { kicker: 'Low bandwidth', accent: 'blue',    title: 'Voice-only fallback when video drops',        sub: 'If your data dips below 250 Kbps, we switch you to a clean audio consult automatically.', Icon: Wifi        },
    { kicker: 'Family',        accent: 'violet',  title: 'Share with family safely',                    sub: 'Add your spouse, parents, or children with role-based access. Records stay encrypted.',   Icon: Users       },
  ]
  return (
    <section style={{ padding: '32px clamp(20px, 4vw, 56px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <SectionHeader
          kicker="What we do differently"
          title="Built for how Pakistan actually talks, pays, and trusts."
          sub="Most telehealth assumes English, debit cards, and broadband. We assumed none of that and started over."
        />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16, marginTop: 32,
        }}>
          {feats.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ kicker, accent, title, sub, Icon }: { kicker: string; accent: Accent; title: string; sub: string; Icon: IconCmp }) {
  const a = ACCENT_MAP[accent]
  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 22, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        height: 140, borderRadius: 14,
        background: 'linear-gradient(180deg, var(--bg-soft), var(--bg-elev))',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          width: 56, height: 56, borderRadius: 16,
          background: a.bg, color: a.fg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={26} strokeWidth={2} />
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: a.fg, letterSpacing: '.06em', textTransform: 'uppercase' }}>{kicker}</span>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.3 }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{sub}</p>
    </div>
  )
}

function SectionHeader({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'left', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {kicker && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--blue-700)',
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>{kicker}</span>
      )}
      <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15 }}>{title}</h2>
      {sub && <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-3)', lineHeight: 1.55 }}>{sub}</p>}
    </div>
  )
}

/* ───── how it works ───── */
function HowItWorks() {
  const steps: [string, string][] = [
    ['Talk',  "Tap the mic. Describe what's bothering you in your language. We listen for 30–60 seconds."],
    ['Match', 'We pre-read symptoms and route you to a PMDC-licensed doctor who speaks your language.'],
    ['Treat', 'Video consult, AI-assisted notes, and a prescription. Escrow releases when Rx is issued.'],
  ]
  return (
    <section style={{ padding: '64px clamp(20px, 4vw, 56px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <SectionHeader kicker="How it works" title="Three steps. Calm pace. No surprises." />
        <ol style={{
          listStyle: 'none', margin: 0, padding: 0,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}>
          {steps.map(([t, d], i) => (
            <li key={t} style={{
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              borderRadius: 18, padding: 18,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(180deg, var(--blue-500), var(--blue-700))',
                color: '#fff', fontWeight: 700, fontSize: 14,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px -4px rgba(37,99,235,.55)',
                fontFamily: 'var(--font-mono)',
              }}>{i + 1}</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-.01em' }}>{t}</h3>
              <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.5 }}>{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ───── compliance ───── */
function ComplianceSection() {
  const items: { Icon: IconCmp; t: string; s: string }[] = [
    { Icon: ShieldCheck, t: 'PMDC', s: 'Pakistan Medical & Dental Council · doctor licensure' },
    { Icon: CreditCard,  t: 'SBP',  s: 'State Bank · escrow & PCI-DSS via Stripe Connect' },
    { Icon: Shield,      t: 'PECA', s: 'Prevention of Electronic Crimes Act · data residency' },
    { Icon: Phone,       t: 'PTA',  s: 'Telecom Authority · OTP & SMS compliance' },
  ]
  return (
    <section style={{
      padding: '48px clamp(20px, 4vw, 56px)',
      background: 'var(--bg-soft)',
      borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          kicker="Built on regulated rails"
          title="Identity, licensing, and money — verified by the institutions Pakistan already trusts."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {items.map(({ Icon, t, s }) => (
            <div key={t} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: 16, background: 'var(--bg-elev)',
              border: '1px solid var(--border)', borderRadius: 16,
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10, flex: 'none',
                background: 'rgba(37,99,235,.10)', color: 'var(--blue-700)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45, marginTop: 2 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───── footer CTA ───── */
function FooterCta({ onCta }: { onCta: () => void }) {
  return (
    <section style={{ padding: '64px clamp(20px, 4vw, 56px)' }}>
      <div style={{
        maxWidth: 980, margin: '0 auto',
        background: 'linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 50%, var(--violet-600) 100%)',
        borderRadius: 28, padding: 'clamp(28px, 5vw, 56px)',
        color: '#fff', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        boxShadow: '0 28px 64px -24px rgba(37,99,235,.55)',
        position: 'relative', overflow: 'hidden',
      }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-.02em' }}>
          A doctor in your pocket — in your language.
        </h2>
        <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,.85)', maxWidth: 540, lineHeight: 1.5 }}>
          Start a consult in under a minute. You pay nothing until a prescription is issued.
        </p>
        <button onClick={onCta} className="focus-ring"
          style={{
            background: '#fff', color: 'var(--blue-700)', border: 0,
            padding: '0 22px', height: 52, borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 20px -8px rgba(0,0,0,.25)', marginTop: 6,
          }}>
          Start a consult <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  )
}

/* ───── footer ───── */
function Footer({ onNav }: { onNav: (t: NavTarget) => void }) {
  return (
    <footer style={{ padding: '40px clamp(20px, 4vw, 56px) 60px', borderTop: '1px solid var(--border)' }}>
      <div style={{
        maxWidth: 1180, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24,
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 9,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(180deg, var(--blue-500), var(--blue-700))',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>M</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>MedIntel</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Voice-first telemedicine for Pakistan.<br />
            Made in Karachi · regulated under PMDC.
          </p>
        </div>
        <FooterCol title="Product" items={[
          ['For patients', 'intake'],
          ['For doctors',  'register-doctor'],
          ['For clinics',  'register'],
        ]} onNav={onNav} />
        <FooterCol title="Trust" items={[
          ['Terms',           'legal-terms'],
          ['Privacy',         'legal-privacy'],
          ['PMDC compliance', 'legal-pmdc'],
        ]} onNav={onNav} />
        <FooterCol title="Company" items={[['About', null], ['Careers', null], ['Press', null]]} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Need help?
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <a href="tel:+92021111634683" style={{ color: 'inherit', textDecoration: 'none' }}>+92 21 111 MEDINT</a><br />
            <a href="mailto:hello@medintel.pk" style={{ color: 'inherit', textDecoration: 'none' }}>hello@medintel.pk</a>
          </div>
        </div>
      </div>
      <div style={{
        maxWidth: 1180, margin: '40px auto 0', paddingTop: 20,
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        fontSize: 11, color: 'var(--ink-4)',
      }}>
        <span>© 2026 MedIntel Health (Pvt) Ltd. CUIN 0184902.</span>
        <span className="mono">v1.0.0</span>
      </div>
    </footer>
  )
}

function FooterCol({ title, items, onNav }: {
  title: string
  items: [string, NavTarget | null][]
  onNav?: (t: NavTarget) => void
}) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
        letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10,
      }}>{title}</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(([t, target]) => (
          <li key={t}>
            <button
              onClick={() => target && onNav?.(target)}
              style={{
                background: 'transparent', border: 0, padding: 0,
                color: 'var(--ink-2)', fontSize: 13, cursor: target ? 'pointer' : 'default',
                fontFamily: 'var(--font-ui)', textAlign: 'left',
              }}
            >{t}</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
