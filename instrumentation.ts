/**
 * Next.js instrumentation hook — runs once at server start, in each runtime.
 *
 * Wires Sentry into the Node runtime and the Edge runtime (middleware).
 * If SENTRY_DSN is unset, Sentry init is a no-op — errors just go to console,
 * which is the desired behavior in local dev and previews without a DSN.
 */

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string
    method: string
    headers: { [key: string]: string | undefined }
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
  },
) {
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(err, request, context)
}
