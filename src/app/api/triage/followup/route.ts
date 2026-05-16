/**
 * POST /api/triage/followup
 *
 * Body: { transcript: string, triage: TriageOutput }
 * Returns: { followups: { questions: [...] }, source }
 *
 * Called from the intake UI when the agent's confidence is below the floor or
 * key slots are empty. The patient answers in a follow-up textarea, then we
 * re-run /api/voice/transcribe-text with the concatenated transcript so the
 * second pass has more signal.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { TriageOutput } from '@/lib/triage/agent'
import { generateFollowups, needsFollowup } from '@/lib/triage/followup'

const bodySchema = z.object({
  transcript: z.string().min(3).max(4000),
  triage:     TriageOutput,
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(req, { key: 'triage-followup', max: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body   = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Short-circuit: if the original triage is confident, return no questions.
  if (!needsFollowup(parsed.data.triage)) {
    return NextResponse.json({ followups: { questions: [] }, source: 'skip' })
  }

  const { followups, source } = await generateFollowups(parsed.data.transcript, parsed.data.triage)
  return NextResponse.json({ followups, source })
}
