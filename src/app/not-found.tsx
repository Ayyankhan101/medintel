'use client'
import { useI18n } from '@/lib/i18n/client'
import Link from 'next/link'

export default function NotFound() {
  const { T } = useI18n()
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-3xl font-semibold text-slate-900">{T('notFound.title')}</h1>
        <p className="text-slate-600">{T('notFound.body')}</p>
        <div className="flex gap-2 justify-center">
          <Link href="/" className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">
            {T('notFound.home')}
          </Link>
          <Link href="/doctors" className="inline-flex items-center px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
            {T('nav.doctors')}
          </Link>
        </div>
      </div>
    </div>
  )
}
