import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimitDb, clientIp } from '@/lib/rate-limit'
import { sendPasswordReset } from '@/lib/email'
import { randomToken, PASSWORD_RESET_TTL_MS } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const rl = await rateLimitDb('pw-reset', clientIp(req), { max: 5, windowMs: 15 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

  // Always return ok — no enumeration.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (user) {
    const token = randomToken()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken:   token,
        passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    })
    void sendPasswordReset({ to: user.email, name: user.name ?? 'there', token })
  }
  return NextResponse.json({ ok: true })
}
