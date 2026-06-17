'use client'
import { useI18n } from '@/lib/i18n/client'
import Link from 'next/link'

export default function OfflinePage() {
  const { T } = useI18n()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.111 8.111A7 7 0 0118 18M5.282 5.282A10 10 0 0118.718 18.718M12 12v.01" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{T('offline.title')}</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          {T('offline.body')}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-4 text-left space-y-2">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Emergency</p>
        <a href="tel:1122" className="flex items-center gap-2 text-sm font-medium text-red-800">
          <span>🚑</span> Rescue 1122
        </a>
        <a href="tel:115" className="flex items-center gap-2 text-sm font-medium text-red-800">
          <span>🏥</span> Edhi Foundation 115
        </a>
        <a href="tel:1021" className="flex items-center gap-2 text-sm font-medium text-red-800">
          <span>🩺</span> Sehat Sahulat 1021
        </a>
      </div>

      <Link
        href="/"
        className="text-blue-600 text-sm underline underline-offset-2"
      >
        {T('offline.retry')}
      </Link>
    </main>
  )
}
