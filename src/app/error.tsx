'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useI18n } from '@/lib/i18n/client'
import { Btn } from '@/components/design/Btn'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { T } = useI18n()
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-semibold text-slate-900">{T('error.title')}</h1>
        <p className="text-slate-600">
          {T('error.body')}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">{T('error.ref')} {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Btn onClick={reset}>{T('error.tryAgain')}</Btn>
          <Btn kind="ghost" onClick={() => (window.location.href = '/')}>{T('error.goHome')}</Btn>
        </div>
      </div>
    </div>
  )
}
