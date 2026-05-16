/**
 * Deterministic keyword-based triage scoring + department mapping.
 *
 * Used as a fallback when the LLM agent (`./triage/agent`) fails, and by the
 * post-consultation analyze endpoint to derive missing fields.
 *
 * Single source of truth: openai.ts and triage/agent.ts both delegate here.
 */
import { inferSpecialtyFromKeywords } from './triage/specialties'

export type SeverityLevel = 'ROUTINE' | 'URGENT' | 'CRITICAL'

const CRITICAL_KEYWORDS = [
  // cardiac / pulmonary arrest
  'troponin', 'heart attack', 'myocardial infarction', 'crushing chest', 'cardiac arrest',
  // airway
  "can't breathe", "cannot breathe", 'not able to breath', 'unable to breath',
  'not breathing', 'difficulty breathing', 'choking',
  // neuro
  'stroke', 'unconscious', 'unresponsive', 'paralysis', 'seizure', 'seizure uncontrolled',
  'not able to speak', 'blacking out', 'passing out',
  // shock / bleeding / poisoning
  'anaphylaxis', 'overdose', 'haemorrhage', 'hemorrhage', 'arterial bleeding',
  'blood pressure 180',
]

const URGENT_KEYWORDS = [
  'severe', 'intense', 'unbearable', 'excruciating', 'worst pain', 'extreme pain',
  'vomiting blood', 'high fever', 'fever 40',
  'unable to walk', 'cannot move',
  'blurred vision', 'chest pain', 'chest tightness', 'rapid heartbeat',
  'shortness of breath', 'breathless',
  'confusion', 'disoriented',
]

const MILD_KEYWORDS = [
  'mild', 'slight', 'little', 'a little', 'minor', 'occasional', 'sometimes',
  'manageable', 'better when resting', 'bit of',
]

/**
 * Bucketed severity: 9 (critical) / 6 (urgent) / 2 (mild) / 4 (default).
 * Stable, predictable — preferred for fallback paths and UI banners.
 */
export function scoreFromKeywords(text: string): number {
  const lower = text.toLowerCase()
  if (CRITICAL_KEYWORDS.some(w => lower.includes(w))) return 9
  if (URGENT_KEYWORDS.some(w => lower.includes(w)))   return 6
  if (MILD_KEYWORDS.some(w => lower.includes(w)))     return 2
  return 4
}

/**
 * Graded severity: critical scales 8→10 with match count, urgent 5→7, mild 2.
 * Used by the appointment-analyze endpoint where a more granular score is wanted.
 */
export function computeScore(text: string): number {
  const lower = text.toLowerCase()

  if (CRITICAL_KEYWORDS.some(kw => lower.includes(kw))) {
    const matches = CRITICAL_KEYWORDS.filter(kw => lower.includes(kw)).length
    return Math.min(10, 8 + matches)
  }

  if (URGENT_KEYWORDS.some(kw => lower.includes(kw))) {
    const matches = URGENT_KEYWORDS.filter(kw => lower.includes(kw)).length
    return Math.min(7, 5 + Math.floor(matches / 2))
  }

  if (MILD_KEYWORDS.some(kw => lower.includes(kw))) return 2

  return 4
}

export function computeSeverityLevel(score: number): SeverityLevel {
  const clamped = Math.max(1, Math.min(10, score))
  if (clamped <= 4) return 'ROUTINE'
  if (clamped <= 7) return 'URGENT'
  return 'CRITICAL'
}

/** Department name from free-text symptoms. Delegates to the canonical specialty registry. */
export function mapDepartment(text: string): string {
  return inferSpecialtyFromKeywords(text)
}
