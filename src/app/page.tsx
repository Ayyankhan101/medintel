import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">MedIntel</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          Voice-First · AI-Powered · Pakistan
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Healthcare that speaks{' '}
          <span className="text-blue-600">your language</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Describe your symptoms in Urdu or English — MedIntel transcribes, triages,
          and connects you with a verified doctor. Payments held in escrow until
          your prescription is delivered.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link
            href="/register"
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-center transition-colors"
          >
            Start as Patient
          </Link>
          <Link
            href="/login"
            className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-center transition-colors"
          >
            Doctor Login
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-gray-100 bg-white py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { icon: '🎙️', title: 'Voice Intake',    desc: 'Speak in Urdu or English' },
            { icon: '🧠', title: 'AI Triage',        desc: 'Severity score & department' },
            { icon: '🔒', title: 'Escrow Payment',   desc: 'Pay only after prescription' },
            { icon: '🚨', title: 'Emergency Alert',  desc: 'First-aid + nearest hospitals' },
          ].map(f => (
            <div key={f.title} className="space-y-2">
              <div className="text-3xl">{f.icon}</div>
              <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
