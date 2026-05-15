/**
 * PATCH /api/clinic/settings — clinic-admin updates brand + contact numbers.
 *   body: { name?, brandColor?, whatsappNumber?, voiceNumber? }
 *
 * Plan / slug / quota / Stripe IDs are NOT editable here — those are mutated
 * by webhooks or signup only. Empty string clears a nullable field.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// E.164: leading + and 8-15 digits. Empty string allowed to clear.
const phone = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Must be E.164 (e.g. +923001234567)')

const schema = z.object({
  name:           z.string().trim().min(2).max(80).optional(),
  brandColor:     z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal('')]).optional(),
  whatsappNumber: z.union([phone, z.literal('')]).optional(),
  voiceNumber:    z.union([phone, z.literal('')]).optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rl = rateLimit(req, { key: 'clinic-settings', max: 30, windowMs: 15 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many updates. Try again later.' }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const clinic = await prisma.clinic.findUnique({ where: { ownerUserId: session.user.id }, select: { id: true } })
  if (!clinic) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  const data: Record<string, string | null> = {}
  if (parsed.data.name !== undefined)           data.name           = parsed.data.name
  if (parsed.data.brandColor !== undefined)     data.brandColor     = parsed.data.brandColor === '' ? null : parsed.data.brandColor
  if (parsed.data.whatsappNumber !== undefined) data.whatsappNumber = parsed.data.whatsappNumber === '' ? null : parsed.data.whatsappNumber
  if (parsed.data.voiceNumber !== undefined)    data.voiceNumber    = parsed.data.voiceNumber === '' ? null : parsed.data.voiceNumber

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true, unchanged: true })

  const updated = await prisma.clinic.update({
    where: { id: clinic.id },
    data,
    select: { id: true, name: true, slug: true, brandColor: true, whatsappNumber: true, voiceNumber: true },
  })

  void audit('clinic.settings_update', 'Clinic', clinic.id, {
    actorId:   session.user.id,
    actorRole: 'CLINIC_ADMIN',
    fields:    Object.keys(data),
  })

  return NextResponse.json({ clinic: updated })
}
