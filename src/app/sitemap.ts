import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const base = process.env.NEXTAUTH_URL ?? 'https://medintel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`,                 lastModified: now, changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/login`,            lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/register`,         lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/register/doctor`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/clinic/register`,  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/legal/terms`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/legal/privacy`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/legal/pmdc`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/legal/refunds`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/legal/cookies`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ]

  // Active clinic public profiles — pulled at request time so newly-onboarded
  // clinics show up without a redeploy. Capped at 5k; split into a sitemap-
  // index if the platform ever needs more than that.
  let clinicEntries: MetadataRoute.Sitemap = []
  try {
    const clinics = await prisma.clinic.findMany({
      where:  { active: true },
      select: { slug: true, updatedAt: true },
      take:   5000,
    })
    clinicEntries = clinics.map(c => ({
      url:             `${base}/c/${c.slug}`,
      lastModified:    c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority:        0.5,
    }))
  } catch {
    // DB unreachable at build time — fall back to static entries.
  }

  return [...staticEntries, ...clinicEntries]
}
