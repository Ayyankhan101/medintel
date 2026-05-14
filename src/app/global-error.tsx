'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="en">
      <body style={{
        margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        background: '#f8fafc', color: '#0f172a',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            We&apos;ve been notified and are looking into it. You can try again, or head back to the home page.
          </p>
          {error.digest && (
            <p style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'ui-monospace, monospace', margin: '0 0 20px' }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              background: '#2563eb', color: '#fff', border: 0, padding: '10px 18px',
              borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
