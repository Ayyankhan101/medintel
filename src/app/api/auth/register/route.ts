import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyPatientCNIC, generateMedIntelCode } from '@/lib/kyc'

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  fullName: z.string().min(2),
  cnicNumber: z.string().length(13),
  dateOfBirth: z.string(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, phone, password, fullName, cnicNumber, dateOfBirth } = parsed.data

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }, { cnicNumber }] },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Account already exists with this email, phone, or CNIC' },
      { status: 409 }
    )
  }

  const kyc = await verifyPatientCNIC({ cnicNumber, fullName, dateOfBirth })
  if (!kyc.verified) {
    return NextResponse.json({ error: kyc.reason ?? 'CNIC verification failed' }, { status: 422 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const medIntelCode = kyc.medIntelCode || generateMedIntelCode()

  const user = await prisma.user.create({
    data: {
      email,
      phone,
      passwordHash,
      name: fullName,
      role: 'PATIENT',
      cnicNumber,
      medIntelCode,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      patient: { create: { dateOfBirth: new Date(dateOfBirth) } },
    },
  })

  return NextResponse.json(
    { message: 'Account created', medIntelCode: user.medIntelCode },
    { status: 201 }
  )
}
