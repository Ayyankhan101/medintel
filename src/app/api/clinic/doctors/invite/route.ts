/**
 * POST /api/clinic/doctors/invite — clinic admin sends a doctor invite
 *   body: { email }
 *
 * DELETE /api/clinic/doctors/invite?id=... — revoke a pending invite
 *
 * If an existing user with this email is already a DOCTOR and unlinked,
 * we still create a token-link invite (rather than auto-attach) so the
 * doctor explicitly consents to joining the clinic.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { sendClinicInvite } from '@/lib/email'
import { randomToken } from '@/lib/tokens'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const INVITE_TTL_MS = 7 * 24 * 60 * 60_000

async function ownerClinic(userId: string) {
  return prisma.clinic.findUnique({ where: { ownerUserId: userId }, include: { owner: { select: { name: true } } } })
}

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = rateLimit(req, { key: 'clinic-invite', max: 20, windowMs: 15 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many invites. Try again later.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  const clinic = await ownerClinic(session.user.id)
  if (!clinic) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  // Refuse if the email already belongs to a doctor in this clinic.
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { doctor: { select: { clinicId: true } } },
  })
  if (existing?.doctor?.clinicId === clinic.id) {
    return NextResponse.json({ error: 'This doctor is already in your clinic.' }, { status: 409 })
  }

  const token = randomToken()
  try {
    const invite = await prisma.clinicInvite.upsert({
      where:  { clinicId_email: { clinicId: clinic.id, email: parsed.data.email } },
      update: { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS), acceptedAt: null, invitedBy: session.user.id },
      create: {
        clinicId:  clinic.id,
        email:     parsed.data.email,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedBy: session.user.id,
      },
    })

    void sendClinicInvite({
      to:          invite.email,
      clinicName:  clinic.name,
      inviterName: clinic.owner.name ?? 'A clinic admin',
      token:       invite.token,
    })
    void audit('clinic.invite', 'Clinic', clinic.id, {
      actorId:   session.user.id,
      actorRole: 'CLINIC_ADMIN',
      email:     invite.email,
    })

    return NextResponse.json({ id: invite.id, email: invite.email, expiresAt: invite.expiresAt }, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Already invited' }, { status: 409 })
    }
    console.error('[clinic.invite] failed', e)
    return NextResponse.json({ error: 'Invite failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const clinic = await ownerClinic(session.user.id)
  if (!clinic) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  // Ownership check before delete.
  const invite = await prisma.clinicInvite.findUnique({ where: { id } })
  if (!invite || invite.clinicId !== clinic.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.clinicInvite.delete({ where: { id } })
  void audit('clinic.invite_revoke', 'Clinic', clinic.id, { actorId: session.user.id, email: invite.email })
  return NextResponse.json({ ok: true })
}
