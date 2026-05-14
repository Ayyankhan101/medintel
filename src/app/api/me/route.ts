import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      medIntelCode: true,
      kycStatus: true,
      kycVerifiedAt: true,
      createdAt: true,
      patient: { select: { dateOfBirth: true } },
      doctor: {
        select: {
          licenseNumber: true,
          specialization: true,
          consultationFee: true,
          yearsExperience: true,
          kydStatus: true,
          trustBadge: true,
          stripeAccountId: true,
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}
