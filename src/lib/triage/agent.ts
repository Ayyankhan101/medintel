/**
 * Triage Agent — wraps Groq chat into a strict, validated medical triage call.
 *
 * Design:
 *  - System prompt defines persona, safety rules, and output contract.
 *  - User prompt carries patient input only.
 *  - JSON-mode response (Groq supports response_format: { type: 'json_object' }).
 *  - Output validated against a Zod schema before use.
 *  - On schema failure: one retry with a "fix your JSON" prompt.
 *  - On total failure: fall through to deterministic keyword + heuristic fallback.
 *  - All output normalized (severity clamped 1-10, specialty whitelisted).
 *  - Severity > 8 raises an `isEmergency` flag the UI uses to show 1122 banner.
 */

import OpenAI from 'openai'
import { z } from 'zod'
import {
  SPECIALTY_NAMES,
  normalizeSpecialty,
  inferSpecialtyFromKeywords,
  specialtyPromptList,
} from './specialties'

// ── client ────────────────────────────────────────────────────────────────────

let _client: OpenAI | null = null
function client(): OpenAI {
  if (_client) return _client
  const useGroq = !!process.env.GROQ_API_KEY
  _client = new OpenAI({
    apiKey:  useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
    baseURL: useGroq ? (process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1') : undefined,
  })
  return _client
}

const CHAT_MODEL = process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'

// ── output schema ─────────────────────────────────────────────────────────────

export const TriageOutput = z.object({
  chiefComplaint:    z.string().min(2).max(200),
  symptoms:          z.array(z.string()).default([]),
  duration:          z.string().default('unknown'),
  redFlags:          z.array(z.string()).default([]),
  medicalTermSummary: z.string().min(10).max(800),
  severityScore:     z.number().int().min(1).max(10),
  severityLevel:     z.enum(['ROUTINE', 'URGENT', 'CRITICAL']),
  specialty:         z.string(),
  confidence:        z.number().min(0).max(1).default(0.7),
  reasoning:         z.string().max(400).default(''),
})
export type TriageOutput = z.infer<typeof TriageOutput>

// ── prompts ───────────────────────────────────────────────────────────────────

function systemPrompt(): string {
  return `You are MedIntel Triage — a clinical-grade AI triage assistant for an online consultation platform serving Pakistan.

Your sole job: take a patient's free-form complaint (Urdu, Pashto, Punjabi, Sindhi, or English) and produce a STRUCTURED JSON triage report.

# Your responsibilities
1. Identify the chief complaint in one sentence.
2. List discrete symptoms.
3. Score clinical severity on a 1-10 scale.
4. Pick exactly one specialty from the allowed list (matching the patient's primary issue).
5. Flag red-flag symptoms (anything suggesting emergency).
6. Be conservative — when uncertain, score higher, not lower.

# Severity scale
- 1-3 ROUTINE — minor (sneezing, mild rash, slight headache). Patient can wait days.
- 4-5 ROUTINE/URGENT — moderate (fever >38°C, moderate pain, persistent cough). See doctor within days.
- 6-7 URGENT — should see a doctor today (severe pain, high fever, vomiting blood, breathlessness on rest).
- 8-10 CRITICAL — life-threatening (suspected MI, stroke signs, anaphylaxis, severe bleeding, loss of consciousness, inability to breathe). Patient should go to a hospital ER, not consult online. Map specialty = "Emergency Medicine".

# Specialty list — pick EXACTLY one from these (no others, exact name match):
${specialtyPromptList()}

# Rules
- "Specialty" output MUST be one of the names above, verbatim.
- If unclear → "General Medicine".
- If true emergency → "Emergency Medicine" AND severity 8-10.
- Children under 18 → "Pediatrics" regardless of complaint (unless emergency).
- Pregnancy-related → "Gynecology" (unless emergency).
- Mental-health-only → "Psychiatry".
- Never diagnose. Use "likely", "suggestive of", "compatible with".
- Never recommend specific medications. The doctor does that.

# Output contract
Respond with a SINGLE JSON object, no markdown, no commentary, in this exact shape:
{
  "chiefComplaint":     "one sentence",
  "symptoms":           ["sym1", "sym2"],
  "duration":           "e.g. '2 days', 'since yesterday', 'unknown'",
  "redFlags":           ["any red flags — chest pain radiating to arm, slurred speech, etc."],
  "medicalTermSummary": "professional clinical summary in 2-4 sentences",
  "severityScore":      <integer 1-10>,
  "severityLevel":      "ROUTINE" | "URGENT" | "CRITICAL",
  "specialty":          "one of the allowed names",
  "confidence":         <number 0-1 — how confident you are in this assessment>,
  "reasoning":          "one or two sentences explaining your specialty choice and severity"
}`
}

function userPrompt(input: string): string {
  return `Patient complaint:

"""
${input.trim()}
"""

Return the JSON triage report.`
}

function fixupPrompt(badRaw: string, schemaIssue: string): string {
  return `Your previous JSON failed validation: ${schemaIssue}

You returned:
${badRaw}

Return a SINGLE valid JSON object that matches the schema. No markdown. No commentary.`
}

// ── parse helper ──────────────────────────────────────────────────────────────

function stripFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
}

function tryParse(raw: string): { ok: true; data: TriageOutput } | { ok: false; reason: string } {
  let json: unknown
  try {
    json = JSON.parse(stripFence(raw))
  } catch (e) {
    return { ok: false, reason: `not valid JSON: ${(e as Error).message}` }
  }
  const parsed = TriageOutput.safeParse(json)
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }
  }
  // Whitelist specialty against canonical list.
  const normalized = normalizeSpecialty(parsed.data.specialty)
  if (!normalized) {
    return { ok: false, reason: `specialty '${parsed.data.specialty}' not in allowed list (${SPECIALTY_NAMES.join(', ')})` }
  }
  parsed.data.specialty = normalized
  // Ensure severityLevel is internally consistent with score.
  const score = parsed.data.severityScore
  parsed.data.severityLevel = score <= 4 ? 'ROUTINE' : score <= 7 ? 'URGENT' : 'CRITICAL'
  return { ok: true, data: parsed.data }
}

// ── deterministic fallback ────────────────────────────────────────────────────

function deterministicFallback(input: string): TriageOutput {
  const lower = input.toLowerCase()
  const criticalWords = [
    "can't breathe", 'cannot breathe', 'not able to breath', 'unable to breath', 'not breathing',
    'crushing chest', 'heart attack', 'cardiac arrest', 'unconscious', 'unresponsive',
    'stroke', 'seizure', 'anaphylaxis', 'choking', 'overdose', 'passing out', 'blacking out',
  ]
  const urgentWords = [
    'severe', 'intense', 'unbearable', 'excruciating', 'worst pain', 'high fever',
    'shortness of breath', 'difficulty breathing', 'vomiting blood', 'unable to walk',
    'chest pain', 'chest tightness', 'paralysis', 'extreme pain',
  ]
  const mildWords = ['mild', 'slight', 'minor', 'a little', 'bit of']

  let score = 4
  if (criticalWords.some(w => lower.includes(w))) score = 9
  else if (urgentWords.some(w => lower.includes(w))) score = 6
  else if (mildWords.some(w => lower.includes(w))) score = 2

  const specialty = score >= 8 ? 'Emergency Medicine' : inferSpecialtyFromKeywords(input)
  const level: TriageOutput['severityLevel'] = score <= 4 ? 'ROUTINE' : score <= 7 ? 'URGENT' : 'CRITICAL'

  return {
    chiefComplaint:     input.slice(0, 120),
    symptoms:           [],
    duration:           'unknown',
    redFlags:           [],
    medicalTermSummary: `Heuristic triage fallback (AI unavailable). Patient reports: "${input.slice(0, 200)}".`,
    severityScore:      score,
    severityLevel:      level,
    specialty,
    confidence:         0.3,
    reasoning:          'Keyword fallback — AI not consulted.',
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export interface TriageAgentResult {
  output:     TriageOutput
  /** 'llm' if AI ran successfully, 'fallback' if we used keyword heuristic. */
  source:     'llm' | 'llm-retry' | 'fallback'
  isEmergency: boolean
}

export async function runTriageAgent(input: string): Promise<TriageAgentResult> {
  if (!input?.trim() || input.trim().length < 3) {
    throw new Error('Patient input is too short')
  }

  // ── First call ──────────────────────────────────────────────────────────────
  let raw1 = ''
  try {
    const completion = await client().chat.completions.create({
      model:       CHAT_MODEL,
      temperature: 0.1,
      max_tokens:  600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user',   content: userPrompt(input) },
      ],
    })
    raw1 = completion.choices[0]?.message?.content ?? ''
  } catch (e) {
    console.error('[triage-agent] LLM call failed:', e)
    const fb = deterministicFallback(input)
    return { output: fb, source: 'fallback', isEmergency: fb.severityScore >= 8 }
  }

  const first = tryParse(raw1)
  if (first.ok) {
    return { output: first.data, source: 'llm', isEmergency: first.data.severityScore >= 8 }
  }

  // ── Retry once with fix-up prompt ────────────────────────────────────────────
  console.warn('[triage-agent] first parse failed:', first.reason)
  let raw2 = ''
  try {
    const completion = await client().chat.completions.create({
      model:       CHAT_MODEL,
      temperature: 0,
      max_tokens:  600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user',   content: userPrompt(input) },
        { role: 'assistant', content: raw1 },
        { role: 'user',   content: fixupPrompt(raw1, first.reason) },
      ],
    })
    raw2 = completion.choices[0]?.message?.content ?? ''
  } catch (e) {
    console.error('[triage-agent] retry call failed:', e)
    const fb = deterministicFallback(input)
    return { output: fb, source: 'fallback', isEmergency: fb.severityScore >= 8 }
  }

  const second = tryParse(raw2)
  if (second.ok) {
    return { output: second.data, source: 'llm-retry', isEmergency: second.data.severityScore >= 8 }
  }

  console.error('[triage-agent] retry also failed:', second.reason)
  const fb = deterministicFallback(input)
  return { output: fb, source: 'fallback', isEmergency: fb.severityScore >= 8 }
}
