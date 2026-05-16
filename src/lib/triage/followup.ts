/**
 * Triage follow-up question generator.
 *
 * Used when the main triage agent comes back with `confidence < CONFIDENCE_FLOOR`,
 * empty symptoms, or unknown duration. We ask the LLM for 1–2 short, plain-
 * language clarifying questions in Urdu + English so the patient can refine
 * their complaint before we commit to a final triage.
 *
 * Falls back to a deterministic 2-question template when the LLM is
 * unavailable so the UI never gets stuck.
 */

import { z } from 'zod'
import { getLlmClient, CHAT_MODEL } from '../llm-client'
import type { TriageOutput } from './agent'

export const CONFIDENCE_FLOOR = 0.7
export const MAX_FOLLOWUPS    = 2

export const FollowupOutput = z.object({
  questions: z.array(
    z.object({
      en: z.string().min(3).max(160),
      ur: z.string().min(3).max(160),
      slot: z.enum(['duration', 'severity', 'location', 'context', 'history']).default('context'),
    })
  ).min(1).max(MAX_FOLLOWUPS),
})
export type FollowupOutput = z.infer<typeof FollowupOutput>

/** True when triage output is too uncertain or thin to act on. */
export function needsFollowup(t: TriageOutput): boolean {
  if (t.confidence < CONFIDENCE_FLOOR) return true
  if (t.symptoms.length === 0)         return true
  if (t.duration === 'unknown')        return true
  return false
}

const SYSTEM = `You are a clinical triage assistant collecting more information from a Pakistani patient before finalising a triage decision.

Output: 1 or 2 SHORT, plain-language follow-up questions that would most reduce your uncertainty about severity, specialty, or red-flags.

Rules:
- One sentence each, no medical jargon, max ~120 characters.
- Provide both English (en) and Urdu (ur) versions.
- DO NOT diagnose, recommend medication, or list symptoms — just ASK.
- Prefer questions that distinguish emergency from urgent from routine (e.g. duration, intensity, what makes it worse, associated symptoms).
- "slot" labels the kind of info you're after: duration | severity | location | context | history.

Output strict JSON: { "questions": [ { "en": "...", "ur": "...", "slot": "..." } ] }`

function deterministicFollowups(t: TriageOutput): FollowupOutput {
  // Generic 2-question fallback — covers duration + severity which are the
  // two highest-yield slots when the agent is uncertain.
  const qs: FollowupOutput['questions'] = []
  if (t.duration === 'unknown') {
    qs.push({
      slot: 'duration',
      en:   'How long have you been feeling this — hours, days, or weeks?',
      ur:   'یہ تکلیف کب سے ہے — گھنٹے، دن یا ہفتے؟',
    })
  }
  qs.push({
    slot: 'severity',
    en:   'On a scale of 1 (mild) to 10 (worst pain), how bad is it right now?',
    ur:   'تکلیف کی شدت 1 سے 10 کے درمیان کتنی ہے؟ (1 ہلکی، 10 شدید)',
  })
  return { questions: qs.slice(0, MAX_FOLLOWUPS) }
}

export async function generateFollowups(
  patientInput: string,
  triage: TriageOutput,
): Promise<{ followups: FollowupOutput; source: 'llm' | 'fallback' }> {
  const prompt = `Patient said:\n"""\n${patientInput.slice(0, 1500)}\n"""\n\nCurrent triage (uncertain — confidence=${triage.confidence}):\n${JSON.stringify({
    chiefComplaint: triage.chiefComplaint,
    symptoms:       triage.symptoms,
    duration:       triage.duration,
    specialty:      triage.specialty,
    severityScore:  triage.severityScore,
  }, null, 2)}\n\nAsk 1–2 follow-up questions.`

  try {
    const completion = await getLlmClient().chat.completions.create({
      model:       CHAT_MODEL,
      temperature: 0.1,
      max_tokens:  400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user',   content: prompt },
      ],
    })
    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = FollowupOutput.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn('[triage/followup] schema parse failed, using fallback', parsed.error.flatten())
      return { followups: deterministicFollowups(triage), source: 'fallback' }
    }
    return { followups: parsed.data, source: 'llm' }
  } catch (e) {
    console.error('[triage/followup] LLM error:', e)
    return { followups: deterministicFollowups(triage), source: 'fallback' }
  }
}
