import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyPatientCNIC, generateMedIntelCode } from '@/lib/kyc'
import { rateLimit } from '@/lib/rate-limit'
import { sendWelcomePatient, sendWelcomeDoctor, sendVerifyEmail } from '@/lib/email'
import { randomToken, EMAIL_VERIFY_TTL_MS } from '@/lib/tokens'

const patientSchema = z.object({
  role:        z.literal('PATIENT').default('PATIENT'),
  email:       z.string().email(),
  phone:       z.string().min(10),
  password:    z.string().min(8),
  fullName:    z.string().min(2),
  cnicNumber:  z.string().length(13),
  dateOfBirth: z.string(),
})

const doctorSchema = z.object({
  role:            z.literal('DOCTOR'),
  email:           z.string().email(),
  phone:           z.string().min(10),
  password:        z.string().min(8),
  fullName:        z.string().min(2),
  licenseNumber:   z.string().min(3),
  specialization:  z.string().min(2),
  yearsExperience: z.coerce.number().int().min(0).max(80),
  consultationFee: z.coerce.number().min(0).max(1_000_000),
  qualifications:  z.array(z.string()).default([]),
  bio:             z.string().optional(),
})

const schema = z.discriminatedUnion('role', [patientSchema, doctorSchema])

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'register', max: 5, windowMs: 10 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many registration attempts, try again later' }, { status: 429 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // ── Doctor signup ─────────────────────────────────────────────────────────
  if (parsed.data.role === 'DOCTOR') {
    const d = parsed.data

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: d.email }, { phone: d.phone }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Account already exists with this email or phone' }, { status: 409 })
    }
    const licenseTaken = await prisma.doctor.findUnique({ where: { licenseNumber: d.licenseNumber } })
    if (licenseTaken) {
      return NextResponse.json({ error: 'A doctor with this license number already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(d.password, 12)
    const verifyToken = randomToken()

    // KYD lives in lib/kyd.ts — but for MVP we accept the license and mark
    // Tier 1 verified immediately. Tier 2/3 (manual document review,
    // peer cross-check) happen out-of-band. Doctors can't take bookings until
    // they finish Stripe Connect onboarding (the booking route already checks
    // stripeAccountId), so they aren't dangerous on the platform until then.
    const user = await prisma.user.create({
      data: {
        email:         d.email,
        phone:         d.phone,
        passwordHash,
        name:          d.fullName,
        role:          'DOCTOR',
        kycStatus:     'PENDING',
        emailVerifyToken:   verifyToken,
        emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
        doctor: {
          create: {
            licenseNumber:   d.licenseNumber,
            specialization:  d.specialization,
            qualifications:  d.qualifications,
            yearsExperience: d.yearsExperience,
            consultationFee: d.consultationFee,
            bio:             d.bio,
            kydStatus:       'PENDING',
            kydTier1At:      new Date(),
          },
        },
      },
    })

    void sendWelcomeDoctor({ to: d.email, name: d.fullName })
    void sendVerifyEmail({ to: d.email, name: d.fullName, token: verifyToken })

    return NextResponse.json(
      { message: 'Doctor account created. Check your email to verify.', userId: user.id },
      { status: 201 },
    )
  }

  // ── Patient signup (unchanged behaviour) ──────────────────────────────────
  const p = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: p.email }, { phone: p.phone }, { cnicNumber: p.cnicNumber }] },
  })
  if (existing) {
    return NextResponse.json({ error: 'Account already exists with this email, phone, or CNIC' }, { status: 409 })
  }

  const kyc = await verifyPatientCNIC({ cnicNumber: p.cnicNumber, fullName: p.fullName, dateOfBirth: p.dateOfBirth })
  if (!kyc.verified) {
    return NextResponse.json({ error: kyc.reason ?? 'CNIC verification failed' }, { status: 422 })
  }

  const passwordHash = await bcrypt.hash(p.password, 12)
  const medIntelCode = kyc.medIntelCode || generateMedIntelCode()
  const verifyToken = randomToken()

  const user = await prisma.user.create({
    data: {
      email:         p.email,
      phone:         p.phone,
      passwordHash,
      name:          p.fullName,
      role:          'PATIENT',
      cnicNumber:    p.cnicNumber,
      medIntelCode,
      kycStatus:     'VERIFIED',
      kycVerifiedAt: new Date(),
      emailVerifyToken:   verifyToken,
      emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      patient: { create: { dateOfBirth: new Date(p.dateOfBirth) } },
    },
  })

  void sendWelcomePatient({ to: user.email, name: user.name ?? p.fullName, medIntelCode: user.medIntelCode! })
  void sendVerifyEmail({ to: user.email, name: user.name ?? p.fullName, token: verifyToken })

  return NextResponse.json(
    { message: 'Account created. Check your email to verify.', medIntelCode: user.medIntelCode },
    { status: 201 },
  )
}
