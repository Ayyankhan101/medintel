/**
 * Doctor presence — heartbeat + status toggle.
 *
 * POST /api/doctor/presence  { online: boolean }
 *
 * Called from the doctor dashboard when they flip the "Available now"
 * switch, and also as a 60-second heartbeat to keep `lastSeenAt` fresh.
 *
 * Front-end pattern:
 *   - Initial mount: POST { online: true }
 *   - setInterval 60s: POST { online: true }  (heartbeat)
 *   - Toggle off / unmount: POST { online: false }
 *
 * Patient-facing queries treat doctors as offline if lastSeenAt > 3 minutes
 * ago, even when isOnline is true, so a crashed/closed tab can't keep them
 * appearing available forever.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({ online: z.boolean() })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR')
    return NextResponse.json({ error: 'Doctors only' }, { status: 403 })

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id! }, select: { id: true } })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })

  await prisma.doctor.update({
    where: { id: doctor.id },
    data:  { isOnline: parsed.data.online, lastSeenAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
