import type { MetadataRoute } from 'next'

const base = process.env.NEXTAUTH_URL ?? 'https://medintel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${base}/`,                 lastModified: now, changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/login`,            lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/register`,         lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/register/doctor`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
