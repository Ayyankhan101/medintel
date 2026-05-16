import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimitDb, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  token:    z.string().min(10),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const rl = await rateLimitDb('pw-set', clientIp(req), { max: 10, windowMs: 15 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { passwordResetToken: parsed.data.token } })
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken:   null,
      passwordResetExpires: null,
      // Using a fresh password is implicit proof of email control.
      emailVerified: user.emailVerified ?? new Date(),
      emailVerifyToken:   null,
      emailVerifyExpires: null,
    },
  })

  return NextResponse.json({ ok: true })
}
