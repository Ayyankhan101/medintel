import Link from 'next/link'
import { Activity, Mic, Brain, Lock, AlertTriangle, ArrowRight, ShieldCheck, Star } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">MedIntel</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
              Sign in
            </Link>
            <Link href="/register" className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-5 py-24 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Now live in Pakistan
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight max-w-2xl mb-5">
          Healthcare that{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            understands you
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-lg mb-10 leading-relaxed">
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
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Doctor login
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          {[
            { icon: ShieldCheck, text: 'NADRA KYC verified' },
            { icon: Lock,        text: 'Escrow-protected payments' },
            { icon: Star,        text: 'PMDC licensed doctors' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-4 h-4 text-slate-400" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-5 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-14">
            From symptom to prescription in minutes
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Mic,
                color: 'bg-red-100 text-red-600',
                step: '01',
                title: 'Voice Intake',
                desc: 'Record your symptoms in Urdu or English. Our medical-grade AI transcribes and understands local dialects.',
              },
              {
                icon: Brain,
                color: 'bg-purple-100 text-purple-600',
                step: '02',
                title: 'AI Triage',
                desc: 'Severity score 1-10, department mapping, and a pre-filled summary sent to your doctor before the call.',
              },
              {
                icon: Lock,
                color: 'bg-green-100 text-green-600',
                step: '03',
                title: 'Escrow Payment',
                desc: 'Pay once. Funds are held securely and released to the doctor only after your prescription is delivered.',
              },
              {
                icon: AlertTriangle,
                color: 'bg-amber-100 text-amber-600',
                step: '04',
                title: 'Emergency Protocol',
                desc: 'Critical symptoms trigger voice guidance, first-aid steps, and show the 3 nearest emergency hospitals.',
              },
            ].map(f => (
              <div key={f.step} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">{f.step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-5 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <Activity className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-slate-600">MedIntel</span>
        </div>
        <p>Built for Pakistan — No patient should die because they couldn't explain their pain.</p>
      </footer>
    </div>
  )
}
