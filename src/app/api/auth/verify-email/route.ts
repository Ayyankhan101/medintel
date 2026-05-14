import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } })
  if (!user || !user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified:      new Date(),
      emailVerifyToken:   null,
      emailVerifyExpires: null,
    },
  })

  return NextResponse.json({ ok: true })
}
