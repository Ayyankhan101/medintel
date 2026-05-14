import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { sendVerifyEmail } from '@/lib/email'
import { randomToken, EMAIL_VERIFY_TTL_MS } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'resend-verify', max: 3, windowMs: 10 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  // Always return ok to avoid email enumeration.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (user && !user.emailVerified) {
    const token = randomToken()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken:   token,
        emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      },
    })
    void sendVerifyEmail({ to: user.email, name: user.name ?? 'there', token })
  }
  return NextResponse.json({ ok: true })
}
