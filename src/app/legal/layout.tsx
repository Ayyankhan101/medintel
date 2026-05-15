import Link from 'next/link'
import { Activity, ArrowLeft } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="max-w-3xl mx-auto h-14 px-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">MedIntel</span>
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10 prose prose-slate dark:prose-invert prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-p:leading-relaxed text-slate-700 dark:text-slate-300">
        {children}
      </main>
      <footer className="border-t border-slate-100 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <nav className="space-x-4">
          <Link href="/legal/terms"   className="hover:text-slate-700 dark:hover:text-slate-200">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-slate-700 dark:hover:text-slate-200">Privacy</Link>
          <Link href="/legal/pmdc"    className="hover:text-slate-700 dark:hover:text-slate-200">PMDC disclaimer</Link>
        </nav>
        <p className="mt-3 text-slate-400">© {new Date().getFullYear()} MedIntel · Karachi, Pakistan</p>
      </footer>
    </div>
  )
}
