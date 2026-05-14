/**
 * GET /api/clinics/[slug] — PUBLIC clinic profile.
 *
 * Returns brand info + KYD-verified doctors only. No auth required.
 * Inactive clinics 404 so a churned subscription can't keep linking out.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 60   // light edge cache, refreshes quickly when roster changes

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params

  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      brandColor: true,
      active: true,
      whatsappNumber: true,
      voiceNumber: true,
      doctors: {
        where:  { kydStatus: 'VERIFIED' },
        select: {
          id: true,
          specialization: true,
          consultationFee: true,
          yearsExperience: true,
          rating: true,
          reviewCount: true,
          trustBadge: true,
          bio: true,
          qualifications: true,
          user: { select: { name: true } },
        },
        orderBy: [{ trustBadge: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }],
        take: 50,
      },
    },
  })

  if (!clinic || !clinic.active) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  return NextResponse.json(clinic)
}
