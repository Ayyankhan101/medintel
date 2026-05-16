/**
 * Clinical scribe — turn a raw doctor↔patient transcript into a structured
 * SOAP note. The output is *assistive only*: the doctor must review and
 * approve before it becomes the official record (mirrors triage's "AI is a
 * helper, never a decision-maker" rule).
 *
 * Workflow:
 *   transcript ─► generateSoapNote() ─► { subjective, objective, assessment,
 *                                          plan, icdHints, language }
 *   Persisted to ConsultationNote.  approvedAt/approvedBy set when the
 *   doctor clicks "Approve" in the UI.
 *
 * Safety rails:
 *   - Output validated against a Zod schema; failures fall back to a
 *     conservative stub so the route never throws.
 *   - JSON-mode response, single retry, callWithBackoff for 429/5xx.
 *   - ICD hints are *suggestions* (3-letter prefix + label) — never the
 *     final billing code.
 *   - Temperature pinned at 0 — clinical text should be deterministic.
 */

import { z } from 'zod'
import { getLlmClient, SCRIBE_MODEL } from './llm-client'

export { SCRIBE_MODEL }

const SoapSchema = z.object({
  subjective: z.string().min(1).max(2_000),
  objective:  z.string().min(1).max(2_000),
  assessment: z.string().min(1).max(2_000),
  plan:       z.string().min(1).max(2_000),
  icdHints:   z.array(z.string()).max(8).default([]),
  language:   z.string().min(2).max(8).default('en'),
})

export type SoapNote = z.infer<typeof SoapSchema>

const client = getLlmClient

const SYSTEM = `You are a clinical scribe assisting a Pakistani GP/specialist. Convert the raw consultation transcript into a SOAP note.

Hard rules:
- Use ONLY content present in the transcript. Never invent vitals, findings, or history.
- Be concise and professional. Each section ≤ 5 short bullet points or 3 sentences.
- Do NOT give a definitive diagnosis. Frame assessments as "likely / suggestive of / differential includes".
- Plan must reflect what the doctor said. Never invent medications, dosages, or referrals.
- ICD hints: up to 5 short codes-with-labels (e.g. "J06 — Acute upper respiratory infection"). Mark as hints; never the final billing code.
- Detect transcript language and return ISO code: en, ur, ps, pa, sd. Default "en" if mixed/unclear.
- Output strict JSON with keys: subjective, objective, assessment, plan, icdHints (array), language.`

function buildUser(transcript: string): string {
  return `TRANSCRIPT:\n"""\n${transcript.slice(0, 12_000)}\n"""\n\nReturn JSON only.`
}

async function callWithBackoff<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try { return await fn() }
    catch (e: unknown) {
      lastErr = e
      const status = (e as { status?: number }).status
      if (status && status !== 429 && status < 500) throw e
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, i)))
    }
  }
  throw lastErr
}

function fallback(transcript: string): SoapNote {
  const head = transcript.trim().slice(0, 400)
  return {
    subjective: head || 'Transcript unavailable.',
    objective:  'Examination findings not captured.',
    assessment: 'Pending doctor review.',
    plan:       'Doctor to add plan manually.',
    icdHints:   [],
    language:   'en',
  }
}

export async function generateSoapNote(transcript: string): Promise<{ note: SoapNote; modelUsed: string; usedFallback: boolean }> {
  if (!transcript || transcript.trim().length < 10) {
    return { note: fallback(transcript), modelUsed: 'fallback', usedFallback: true }
  }

  try {
    const completion = await callWithBackoff(() =>
      client().chat.completions.create({
        model: SCRIBE_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user',   content: buildUser(transcript) },
        ],
      })
    )
    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = SoapSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn('[scribe] schema parse failed, using fallback', parsed.error.flatten())
      return { note: fallback(transcript), modelUsed: SCRIBE_MODEL, usedFallback: true }
    }
    return { note: parsed.data, modelUsed: SCRIBE_MODEL, usedFallback: false }
  } catch (e) {
    console.error('[scribe] LLM error, using fallback', e)
    return { note: fallback(transcript), modelUsed: SCRIBE_MODEL, usedFallback: true }
  }
}
