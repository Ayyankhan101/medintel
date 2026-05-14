/**
 * POST /api/clinic/invite/accept
 *   body: { token }
 *
 * Caller must be signed in as a DOCTOR. Their Doctor row gets clinicId
 * set, and the invite is marked accepted. If the signed-in user's email
 * doesn't match the invite, refuse — token leaks shouldn't enroll
 * someone else.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().min(10) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Sign in required', step: 'login' }, { status: 401 })
  if (session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Only doctor accounts can accept clinic invites.', step: 'role' }, { status: 403 })

  const body   = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const invite = await prisma.clinicInvite.findUnique({ where: { token: parsed.data.token }, include: { clinic: { select: { name: true, id: true } } } })
  if (!invite)                                           return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  if (invite.acceptedAt)                                 return NextResponse.json({ error: 'Invite already used' }, { status: 409 })
  if (invite.expiresAt < new Date())                     return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  if (invite.email.toLowerCase() !== session.user.email!.toLowerCase())
    return NextResponse.json({ error: 'This invite belongs to a different email.' }, { status: 403 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
  if (!doctor) return NextResponse.json({ error: 'No doctor profile on this account' }, { status: 409 })

  await prisma.$transaction([
    prisma.doctor.update({ where: { id: doctor.id }, data: { clinicId: invite.clinicId } }),
    prisma.clinicInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ])

  void audit('clinic.invite_accept', 'Clinic', invite.clinicId, {
    actorId:   session.user.id,
    actorRole: 'DOCTOR',
    doctorId:  doctor.id,
  })

  return NextResponse.json({ ok: true, clinic: invite.clinic })
}
