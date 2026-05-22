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
  compress: true,
  poweredByHeader: false,

  experimental: {
    // Tree-shake large icon/component libraries — only bundle what's imported.
    optimizePackageImports: ['lucide-react', '@base-ui/react', 'tailwind-merge'],
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Cache static doctor list for 30s at CDN edge; clients revalidate stale.
      {
        source: '/api/doctors/online',
        headers: [{ key: 'Cache-Control', value: 's-maxage=30, stale-while-revalidate=60' }],
      },
      // Immutable static assets — aggressive caching for fonts/images/_next.
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
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
