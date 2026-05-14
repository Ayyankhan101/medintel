import type { MetadataRoute } from 'next'

const base = process.env.NEXTAUTH_URL ?? 'https://medintel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/consultation/', '/doctor/', '/admin/', '/history', '/intake', '/book'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
