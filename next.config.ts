import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Security headers applied to every response. CSP is intentionally loose on
// script-src to keep Next's runtime + Sentry tunnel working; tighten with
// nonce-based CSP once the app has fewer inline scripts.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com https://js.stripe.com https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.stripe.com https://api.openai.com https://api.groq.com https://*.twilio.com https://*.amazonaws.com https://*.public.blob.vercel-storage.com https://overpass-api.de https://*.sentry.io",
      "frame-src 'self' https://*.stripe.com https://js.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

// Only wrap with Sentry when org+project+token are configured for source-map
// upload. Without them, withSentryConfig still runs but logs noisy warnings on
// every build — skipping is cleaner for local dev and previews.
const sentryEnabled =
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT &&
  !!process.env.SENTRY_AUTH_TOKEN

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG!,
      project: process.env.SENTRY_PROJECT!,
      authToken: process.env.SENTRY_AUTH_TOKEN!,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      reactComponentAnnotation: { enabled: true },
      tunnelRoute: '/monitoring',
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig
