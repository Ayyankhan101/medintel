'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Btn } from '@/components/design/Btn'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-slate-600">
          We hit an unexpected error. Our team has been notified. You can try again, or come back in a few minutes.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">Reference: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Btn onClick={reset}>Try again</Btn>
          <Btn kind="ghost" onClick={() => (window.location.href = '/')}>Go home</Btn>
        </div>
      </div>
    </div>
  )
}
