/**
 * Tiny wrapper around Sentry — keeps the rest of the codebase from importing
 * @sentry/nextjs directly. If Sentry isn't initialized (no DSN), these are no-ops.
 *
 * Use for *expected* errors you still want logged (e.g. a Stripe call that
 * failed but the user got a clean 502). Unhandled exceptions are captured
 * automatically by Sentry's request handler — you don't need to wrap those.
 */

import * as Sentry from '@sentry/nextjs'

export function captureError(err: unknown, context?: Record<string, unknown>) {
  console.error('[error]', err, context)
  Sentry.captureException(err, { extra: context })
}

export function captureWarn(message: string, context?: Record<string, unknown>) {
  console.warn('[warn]', message, context)
  Sentry.captureMessage(message, { level: 'warning', extra: context })
}

export function setUserContext(user: { id: string; role: string } | null) {
  if (user) Sentry.setUser({ id: user.id, role: user.role })
  else Sentry.setUser(null)
}
