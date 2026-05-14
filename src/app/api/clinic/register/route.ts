/**
 * POST /api/clinic/register
 *
 * Self-serve clinic signup. Creates the clinic-admin User and the Clinic
 * in one transaction so a half-rolled signup can never strand a user.
 *
 * Body:
 *   { email, phone, password, fullName, clinicName, plan?: 'STARTER'|'STANDARD'|'ENTERPRISE' }
 *
 * Side effects:
 *   - Issues an email verification token (24h)
 *   - Sends welcome + verify emails (fail-soft if Resend unconfigured)
 *   - Audit log: clinic.register
 *
 * Rate limit: 3 / 15 min per IP — clinic signup is rare; this blocks
 * scripted enumeration of clinic names.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { sendVerifyEmail, sendWelcomeClinic } from '@/lib/email'
import { randomToken, EMAIL_VERIFY_TTL_MS } from '@/lib/tokens'
import { PLAN_QUOTA, makeSlug } from '@/lib/clinic'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email:      z.string().email(),
  phone:      z.string().min(10).max(20),
  password:   z.string().min(8).max(128),
  fullName:   z.string().min(2).max(80),
  clinicName: z.string().min(2).max(80),
  plan:       z.enum(['STARTER', 'STANDARD', 'ENTERPRISE']).default('STARTER'),
})

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'clinic-register', max: 3, windowMs: 15 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { email, phone, password, fullName, clinicName, plan } = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  })
  if (existing) {
    return NextResponse.json({ error: 'An account already exists with this email or phone' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const verifyToken  = randomToken()
  const slug         = makeSlug(clinicName)

  let userId   = ''
  let clinicId = ''
  try {
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          name: fullName,
          role: 'CLINIC_ADMIN',
          emailVerifyToken:   verifyToken,
          emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
        },
      })
      const clinic = await tx.clinic.create({
        data: {
          name:         clinicName,
          slug,
          ownerUserId:  user.id,
          plan,
          minutesQuota: PLAN_QUOTA[plan],
        },
      })
      // Link the owner user back to their clinic for member-style queries.
      await tx.user.update({ where: { id: user.id }, data: { clinicId: clinic.id } })
      return { userId: user.id, clinicId: clinic.id }
    })
    userId   = result.userId
    clinicId = result.clinicId
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Email, phone, or clinic slug already in use' }, { status: 409 })
    }
    console.error('[clinic.register] failed', e)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }

  void sendVerifyEmail({ to: email, name: fullName, token: verifyToken })
  void sendWelcomeClinic({ to: email, clinicName, ownerName: fullName, plan, slug })
  void audit('clinic.register', 'Clinic', clinicId, { actorId: userId, actorRole: 'CLINIC_ADMIN', plan })

  return NextResponse.json(
    { message: 'Clinic created. Check your email to verify your account.', clinicId, slug },
    { status: 201 },
  )
}
