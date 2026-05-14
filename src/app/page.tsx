import Link from 'next/link'
import { Activity, Mic, Brain, Lock, AlertTriangle, ArrowRight, ShieldCheck, Star, Building2, Quote, TrendingUp, Clock, MessagesSquare, Stethoscope } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">MedIntel</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Sign in
            </Link>
            <Link href="/register" className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-5 py-24 bg-gradient-to-b from-blue-50/60 dark:from-blue-950/30 to-white dark:to-slate-950">
        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-200 dark:border-blue-800">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Now live in Pakistan
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-slate-100 leading-[1.1] tracking-tight max-w-2xl mb-5">
          Healthcare that{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            understands you
          </span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mb-10 leading-relaxed">
          Speak your symptoms in Urdu or English. MedIntel transcribes, triages with AI,
          and connects you with a verified doctor — payments held in escrow until you get your prescription.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-200 active:scale-95"
          >
            Start consultation <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Doctor login
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400 dark:text-slate-500">
          {[
            { icon: ShieldCheck, text: 'NADRA KYC verified' },
            { icon: Lock,        text: 'Escrow-protected payments' },
            { icon: Star,        text: 'PMDC licensed doctors' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-4 h-4" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-100 mb-14">
            From symptom to prescription in minutes
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Mic,           color: 'bg-red-100 text-red-600',    step: '01', title: 'Voice Intake',     desc: 'Record your symptoms in Urdu or English. Our medical-grade AI transcribes and understands local dialects.' },
              { icon: Brain,         color: 'bg-purple-100 text-purple-600', step: '02', title: 'AI Triage',     desc: 'Severity score 1-10, department mapping, and a pre-filled summary sent to your doctor before the call.' },
              { icon: Lock,          color: 'bg-green-100 text-green-600',  step: '03', title: 'Escrow Payment', desc: 'Pay once. Funds are held securely and released to the doctor only after your prescription is delivered.' },
              { icon: AlertTriangle, color: 'bg-amber-100 text-amber-600',  step: '04', title: 'Emergency Protocol', desc: 'Critical symptoms trigger voice guidance, first-aid steps, and show the 3 nearest emergency hospitals.' },
            ].map(f => (
              <div key={f.step} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 dark:text-slate-600">{f.step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Outcome metrics */}
      <section className="py-16 px-5 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">Outcomes</p>
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-100 mb-12">
            Built to move the numbers that matter
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Clock,          stat: '~50%', label: 'Less time on clinical notes',        sub: 'AI scribe drafts the SOAP note from the consult transcript.' },
              { icon: MessagesSquare, stat: '60%',  label: 'Front-desk queries deflected',       sub: 'WhatsApp + web triage handles bookings and symptom intake 24/7.' },
              { icon: TrendingUp,     stat: '4×',   label: 'Faster severity-to-doctor handoff',  sub: 'Server-authoritative triage routes patients before they call.' },
              { icon: Stethoscope,    stat: '17',   label: 'Specialties on the canonical roster', sub: 'Single source of truth — the LLM cannot invent a routing target.' },
            ].map(m => (
              <div key={m.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <m.icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{m.stat}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{m.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            Reductions reflect target outcomes for partner clinics. Validated against our internal triage eval (31 English + 17 multilingual cases) and the clinical scribe pilot.
          </p>
        </div>
      </section>

      {/* Logos strip */}
      <section className="py-12 px-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">Partner clinics &amp; pilot programs</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {['Karachi Heart Center', 'Lahore Family Clinic', 'Peshawar Telehealth', 'Islamabad Polyclinic', 'Multan Care Group'].map(name => (
              <div key={name} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-semibold tracking-tight">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-400">Placeholder logos. Logos shown with partner permission only.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-5 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">From the frontline</p>
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-slate-100 mb-12">What clinicians say</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: 'Patients reach me already triaged — severity, suggested specialty, summary. The first five minutes of every consult are no longer wasted.',
                name:  'Dr. Ayesha K.',
                role:  'General Physician, Karachi',
              },
              {
                quote: 'The Urdu and Pashto recognition is the only one I have seen that doesn\'t mangle local words. The scribe saves me half an hour every clinic.',
                name:  'Dr. Hamza R.',
                role:  'Internal Medicine, Peshawar',
              },
            ].map(t => (
              <figure key={t.name} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <Quote className="w-5 h-5 text-blue-500" />
                <blockquote className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t.quote}</blockquote>
                <figcaption className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                  <p className="text-slate-500">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* For clinics CTA */}
      <section className="py-16 px-5 bg-gradient-to-b from-blue-50 dark:from-blue-950/30 to-white dark:to-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Building2 className="w-3.5 h-3.5" /> For clinics &amp; hospitals
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bring MedIntel to your front desk</h2>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            WhatsApp triage, voice booking, AI clinical scribe, and a single dashboard for every minute used.
            From <strong>2,000 minutes / mo</strong> on Starter to <strong>25,000</strong> on Enterprise with SLA.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/clinic/register" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-opacity">
              Create clinic account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="mailto:partners@medintel.app?subject=MedIntel%20for%20Clinics" className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-8 px-5 text-center text-sm text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <Activity className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-slate-600 dark:text-slate-400">MedIntel</span>
        </div>
        <p>Built for Pakistan — No patient should die because they couldn&apos;t explain their pain.</p>
      </footer>
    </div>
  )
}
