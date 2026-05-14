import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const started = Date.now()
  let db: 'ok' | 'down' = 'down'
  try {
    await prisma.$queryRaw`SELECT 1`
    db = 'ok'
  } catch {
    db = 'down'
  }
  const ai = process.env.GROQ_API_KEY ? 'configured' : 'missing'
  const ok = db === 'ok' && ai === 'configured'
  return NextResponse.json(
    {
      ok,
      db,
      ai,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      uptimeMs: Date.now() - started,
      now: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  )
}
