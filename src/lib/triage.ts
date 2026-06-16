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
 * Negation-word patterns to suppress false keyword matches.
 * Covers common English and clinical documentation negations.
 * NOT included: "can't" — collides with the CRITICAL keyword "can't breathe".
 */
const NEGATION_WORDS = /\b(?:no|not|without|never|denies|denying|no signs of|no history of|no sign of|absence of|negative for|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|won't|wouldn't|couldn't|shouldn't)\s+(?:\w+\s+){0,2}$/i

/**
 * Returns true when `keyword` appears in `text` and is NOT preceded by
 * a negation word within the last 3 tokens.
 *
 * Uses word-boundary matching so "chest" doesn't match "chestnut".
 */
function keywordActive(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}(?:s|es|ing|ed)?\\b`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(0, m.index)
    if (!NEGATION_WORDS.test(before)) return true
  }
  return false
}

/**
 * Bucketed severity: 9 (critical) / 6 (urgent) / 2 (mild) / 6 (default).
 * Conservative default — when uncertain, score higher so the patient gets
 * faster attention rather than being triaged away.
 * Negation-aware: "no chest pain" will NOT trigger URGENT.
 */
export function scoreFromKeywords(text: string): number {
  const lower = text.toLowerCase()
  if (CRITICAL_KEYWORDS.some(w => keywordActive(lower, w))) return 9
  if (URGENT_KEYWORDS.some(w => keywordActive(lower, w)))   return 6
  if (MILD_KEYWORDS.some(w => keywordActive(lower, w)))     return 2
  return 6
}

/**
 * Graded severity: critical scales 8→10 with match count, urgent 5→7, mild 2.
 * Used by the appointment-analyze endpoint where a more granular score is wanted.
 */
export function computeScore(text: string): number {
  const lower = text.toLowerCase()

  if (CRITICAL_KEYWORDS.some(kw => keywordActive(lower, kw))) {
    const matches = CRITICAL_KEYWORDS.filter(kw => keywordActive(lower, kw)).length
    return Math.min(10, 8 + matches)
  }

  if (URGENT_KEYWORDS.some(kw => keywordActive(lower, kw))) {
    const matches = URGENT_KEYWORDS.filter(kw => keywordActive(lower, kw)).length
    return Math.min(7, 5 + Math.floor(matches / 2))
  }

  if (MILD_KEYWORDS.some(kw => keywordActive(lower, kw))) return 2

  return 6
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

// Departments that always require a SENIOR doctor regardless of score.
const SENIOR_DEPARTMENTS = new Set([
  'Emergency Medicine',
  'Cardiology',
  'Neurology',
  'Pulmonology',
  'Oncology',
  'Nephrology',
  'Gastroenterology',
])

/**
 * Returns true when a SENIOR doctor is required.
 * Rules (any match → senior):
 *   1. severityScore ≥ 7
 *   2. severityLevel is CRITICAL
 *   3. department is in the high-acuity set (chest pain / neuro / airway etc.)
 */
export function requiresSenior(
  severityScore: number,
  severityLevel: string,
  department: string,
): boolean {
  if (severityScore >= 7) return true
  if (severityLevel === 'CRITICAL') return true
  if (SENIOR_DEPARTMENTS.has(department)) return true
  return false
}
