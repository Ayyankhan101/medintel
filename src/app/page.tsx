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
import { useI18n } from '@/lib/i18n/client'

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
  const { T } = useI18n()
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
          {T('common.signIn')}
        </button>
        <button onClick={onCta} className="focus-ring"
          style={{
            background: 'var(--blue-600)', color: '#fff', border: 0,
            padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px -4px rgba(37,99,235,.45)',
          }}>
          {T('nav.getStarted')}
        </button>
      </div>
    </header>
  )
}

/* ───── hero ───── */
function Hero({ onCta, onSecondary }: { onCta: () => void; onSecondary: () => void }) {
  const { T } = useI18n()
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
            <span>{T('landing.hero.badge')}</span>
          </span>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.05,
            maxWidth: 920,
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 80ms both',
          }}>
            {T('landing.hero.title1')}
            <br />
            <span style={{
              background: 'linear-gradient(90deg, var(--blue-600), var(--violet-500))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>{T('landing.hero.title2')}</span>
          </h1>

          <p style={{
            margin: 0, maxWidth: 620, fontSize: 18,
            color: 'var(--ink-2)', lineHeight: 1.5,
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 180ms both',
          }}>
            {T('landing.hero.sub')}
          </p>

          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 280ms both',
          }}>
            <Btn kind="primary" onClick={onCta} trailing={<ArrowRight size={16} strokeWidth={2} />}>
              {T('landing.cta.start')}
            </Btn>
            <Btn kind="secondary" onClick={onSecondary}>{T('landing.cta.doctor')}</Btn>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: 12,
            animation: 'mi-fade-up 480ms var(--ease-out-quart) 380ms both',
          }}>
            <VerifiedBadge tier={3} compact />
            <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Shield size={13} strokeWidth={2} /> {T('landing.hero.e2e')}
            </span>
            <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span>{T('landing.hero.audited')}</span>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}

function HeroPreview() {
  const { T } = useI18n()
  const langs: [string, string][] = [[T('intake.lang.en'), 'EN'], ['اردو', 'UR'], ['پښتو', 'PS'], ['پنجابی', 'PA'], ['سنڌي', 'SD']]
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
        <div className="hero-preview-grid" style={{
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
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{T('landing.preview.tap')}</div>
            <div style={{
              display: 'flex', gap: 8, padding: 4,
              background: 'var(--bg-soft)', border: '1px solid var(--border)',
              borderRadius: 999, flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {langs.map(([n, c], i) => (
                <span key={c} className={c === 'EN' ? '' : 'urdu'} style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: i === 1 ? 'var(--bg-elev)' : 'transparent',
                  fontSize: c === 'EN' ? 'var(--text-xs)' : 'var(--text-base)',
                  fontWeight: 600,
                  color: i === 1 ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: i === 1 ? '0 1px 0 rgba(15,23,42,.06)' : 'none',
                }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PreviewLine label={T('landing.preview.aiTriage')} sub={T('landing.preview.lbp')} tone="violet" />
            <PreviewLine label={T('landing.preview.severity')} sub={T('landing.preview.routine')} tone="emerald" />
            <PreviewLine label={T('landing.preview.match')} sub={T('landing.preview.drMatch')} tone="blue" />
            <PreviewLine label={T('landing.preview.escrow')} sub={T('landing.preview.escrowLine').replace('{fee}', PKR(600))} tone="amber" />
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
        fontSize: 'var(--text-xxs)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
        color: m.fg, padding: '2px 8px', borderRadius: 999, background: m.bg,
      }}>{label}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>{sub}</span>
      <Check size={14} strokeWidth={2.5} style={{ color: m.fg }} />
    </div>
  )
}

/* ───── stats band ───── */
function StatsBand() {
  const { T } = useI18n()
  const stats: [string, string, string][] = [
    ['142,000+', T('landing.stats.consults'),    T('landing.stats.consultsSub')],
    ['1,284',    T('landing.stats.doctors'),      T('landing.stats.doctorsSub')],
    ['9m 12s',   T('landing.stats.waitTime'),     T('landing.stats.waitTimeSub')],
    ['71',       T('landing.stats.nps'),           T('landing.stats.npsSub')],
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
  const { T } = useI18n()
  const feats: { kicker: string; accent: Accent; title: string; sub: string; Icon: IconCmp }[] = [
    { kicker: T('landing.feat.voice'),   accent: 'blue',    title: T('landing.feat.voiceTitle'),  sub: T('landing.feat.voiceSub'),  Icon: Mic         },
    { kicker: T('landing.feat.ai'),      accent: 'violet',  title: T('landing.feat.aiTitle'),     sub: T('landing.feat.aiSub'),     Icon: Activity    },
    { kicker: T('landing.feat.escrow'),  accent: 'amber',   title: T('landing.feat.escrowTitle'), sub: T('landing.feat.escrowSub'), Icon: CreditCard  },
    { kicker: T('landing.feat.pmdc'),    accent: 'emerald', title: T('landing.feat.pmdcTitle'),   sub: T('landing.feat.pmdcSub'),   Icon: ShieldCheck },
    { kicker: T('landing.feat.bandwidth'), accent: 'blue',  title: T('landing.feat.bandwidthTitle'), sub: T('landing.feat.bandwidthSub'), Icon: Wifi },
    { kicker: T('landing.feat.family'),  accent: 'violet',  title: T('landing.feat.familyTitle'), sub: T('landing.feat.familySub'), Icon: Users       },
  ]
  return (
    <section style={{ padding: '32px clamp(20px, 4vw, 56px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <SectionHeader
          kicker={T('landing.features.kicker')}
          title={T('landing.features.title')}
          sub={T('landing.features.sub')}
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
  const { T } = useI18n()
  const steps: [string, string][] = [
    [T('landing.step1.title'), T('landing.step1.desc')],
    [T('landing.step2.title'), T('landing.step2.desc')],
    [T('landing.step3.title'), T('landing.step3.desc')],
  ]
  return (
    <section style={{ padding: '64px clamp(20px, 4vw, 56px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <SectionHeader kicker={T('landing.how.kicker')} title={T('landing.how.title')} />
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
  const { T } = useI18n()
  const items: { Icon: IconCmp; t: string; s: string }[] = [
    { Icon: ShieldCheck, t: 'PMDC', s: T('landing.compliance.pmdc') },
    { Icon: CreditCard,  t: 'SBP',  s: T('landing.compliance.sbp') },
    { Icon: Shield,      t: 'PECA', s: T('landing.compliance.peca') },
    { Icon: Phone,       t: 'PTA',  s: T('landing.compliance.pta') },
  ]
  return (
    <section style={{
      padding: '48px clamp(20px, 4vw, 56px)',
      background: 'var(--bg-soft)',
      borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          kicker={T('landing.compliance.kicker')}
          title={T('landing.compliance.title')}
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
  const { T } = useI18n()
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
          {T('landing.ctaTitle')}
        </h2>
        <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,.85)', maxWidth: 540, lineHeight: 1.5 }}>
          {T('landing.ctaSub')}
        </p>
        <button onClick={onCta} className="focus-ring"
          style={{
            background: '#fff', color: 'var(--blue-700)', border: 0,
            padding: '0 22px', height: 52, borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 20px -8px rgba(0,0,0,.25)', marginTop: 6,
          }}>
          {T('landing.ctaBtn')} <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  )
}

/* ───── footer ───── */
function Footer({ onNav }: { onNav: (t: NavTarget) => void }) {
  const { T } = useI18n()
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
            {T('landing.footer.tagline')}<br />
            {T('landing.footer.tagline2')}
          </p>
        </div>
        <FooterCol title={T('landing.footer.product')} items={[
          [T('landing.footer.forPatients'), 'intake'],
          [T('landing.footer.forDoctors'),  'register-doctor'],
          [T('landing.footer.forClinics'),  'register'],
        ]} onNav={onNav} />
        <FooterCol title={T('landing.footer.trust')} items={[
          [T('landing.footer.terms'),           'legal-terms'],
          [T('landing.footer.privacy'),         'legal-privacy'],
          [T('landing.footer.pmdc'), 'legal-pmdc'],
        ]} onNav={onNav} />
        <FooterCol title={T('landing.footer.company')} items={[[T('landing.footer.about'), null], [T('landing.footer.careers'), null], [T('landing.footer.press'), null]]} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            {T('landing.footer.needHelp')}
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
