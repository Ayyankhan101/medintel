/**
 * Clinical scribe — generate or approve a SOAP note for a consultation.
 *
 * POST   /api/consultation/[id]/scribe         body: { transcript }  OR multipart with `audio`
 * PATCH  /api/consultation/[id]/scribe         body: { subjective?, objective?, assessment?, plan?, approve?: boolean }
 * GET    /api/consultation/[id]/scribe         returns the current note
 *
 * Only the assigned doctor (or ADMIN) can generate/edit/approve.
 * The patient can fetch the note via the appointment endpoint only after `approvedAt` is set.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { transcribeAudio } from '@/lib/openai'
import { generateSoapNote } from '@/lib/scribe'
import { audit } from '@/lib/audit'
import { meter } from '@/lib/clinic'

export const dynamic = 'force-dynamic'

async function loadGuarded(id: string, email: string, role: string) {
  const appt = await prisma.appointment.findUnique({
    where:   { id },
    include: { doctor: { include: { user: { select: { id: true, email: true } }, clinic: true } } },
  })
  if (!appt)                                                       return { error: 'Not found',  status: 404 } as const
  if (role !== 'ADMIN' && appt.doctor?.user.email !== email)       return { error: 'Forbidden',  status: 403 } as const
  return { appt } as const
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const g = await loadGuarded(id, session.user.email!, session.user.role)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })

  const note = await prisma.consultationNote.findUnique({ where: { appointmentId: id } })
  if (!note) return NextResponse.json({ error: 'No note yet' }, { status: 404 })
  return NextResponse.json(note)
}

// ── POST (generate) ──────────────────────────────────────────────────────────
const postSchema = z.object({ transcript: z.string().min(10).max(50_000).optional() })

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(req, { key: 'scribe', max: 6, windowMs: 5 * 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many scribe requests' }, { status: 429 })

  const { id } = await ctx.params
  const g = await loadGuarded(id, session.user.email!, session.user.role)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { appt } = g

  if (appt.status === 'CANCELLED' || appt.status === 'REFUNDED') {
    return NextResponse.json({ error: 'Cannot scribe a cancelled appointment' }, { status: 409 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  let transcript = ''

  try {
    if (contentType.startsWith('multipart/')) {
      const form = await req.formData()
      const file = form.get('audio')
      if (!(file instanceof Blob)) return NextResponse.json({ error: 'Missing audio file' }, { status: 400 })
      if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'Audio > 25 MB' }, { status: 413 })
      const buf  = Buffer.from(await file.arrayBuffer())
      const lang = (form.get('language') as string | null) ?? 'en'
      transcript = await transcribeAudio(buf, 'consult.webm', lang)
    } else {
      const body = await req.json().catch(() => ({}))
      const parsed = postSchema.safeParse(body)
      if (!parsed.success || !parsed.data.transcript) {
        return NextResponse.json({ error: 'transcript or audio required' }, { status: 400 })
      }
      transcript = parsed.data.transcript
    }
  } catch (e) {
    console.error('[scribe] input error', e)
    return NextResponse.json({ error: 'Failed to read input' }, { status: 400 })
  }

  const { note, modelUsed, usedFallback } = await generateSoapNote(transcript)

  const saved = await prisma.consultationNote.upsert({
    where:  { appointmentId: id },
    update: {
      transcript,
      subjective: note.subjective,
      objective:  note.objective,
      assessment: note.assessment,
      plan:       note.plan,
      icdHints:   note.icdHints,
      language:   note.language,
      modelUsed,
      approvedAt: null,            // re-generating invalidates a prior approval
      approvedBy: null,
    },
    create: {
      appointmentId: id,
      transcript,
      subjective: note.subjective,
      objective:  note.objective,
      assessment: note.assessment,
      plan:       note.plan,
      icdHints:   note.icdHints,
      language:   note.language,
      modelUsed,
    },
  })

  void audit('scribe.generate', 'Appointment', id, {
    actorId:   session.user.id,
    actorRole: session.user.role,
    modelUsed,
    usedFallback,
    transcriptChars: transcript.length,
  })
  // Bill clinic for scribe minutes (rough heuristic: 150 wpm spoken).
  const clinicId = appt.doctor?.clinicId ?? null
  if (clinicId) void meter(clinicId, 'scribe', Math.ceil(transcript.split(/\s+/).length / 150), { appointmentId: id })

  return NextResponse.json({ note: saved, usedFallback })
}

// ── PATCH (edit / approve) ───────────────────────────────────────────────────
const patchSchema = z.object({
  subjective: z.string().min(1).max(2_000).optional(),
  objective:  z.string().min(1).max(2_000).optional(),
  assessment: z.string().min(1).max(2_000).optional(),
  plan:       z.string().min(1).max(2_000).optional(),
  icdHints:   z.array(z.string().max(120)).max(8).optional(),
  approve:    z.boolean().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const g = await loadGuarded(id, session.user.email!, session.user.role)
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { approve, ...edits } = parsed.data

  const updated = await prisma.consultationNote.update({
    where: { appointmentId: id },
    data: {
      ...edits,
      ...(approve ? { approvedAt: new Date(), approvedBy: session.user.id } : {}),
    },
  })

  if (approve) {
    void audit('scribe.approve', 'Appointment', id, {
      actorId:   session.user.id,
      actorRole: session.user.role,
    })
  }

  return NextResponse.json(updated)
}
