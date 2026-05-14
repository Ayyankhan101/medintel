/**
 * GET /api/clinic/doctors — roster for the caller's clinic
 * Returns doctors + currently-pending invites in one payload so the
 * dashboard can render both lists from a single fetch.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const clinic = await prisma.clinic.findUnique({
    where:   { ownerUserId: session.user.id },
    select:  { id: true },
  })
  if (!clinic) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  const [doctors, invites] = await Promise.all([
    prisma.doctor.findMany({
      where:   { clinicId: clinic.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { user: { createdAt: 'desc' } },
    }),
    prisma.clinicInvite.findMany({
      where:   { clinicId: clinic.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, email: true, expiresAt: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ doctors, invites })
}
