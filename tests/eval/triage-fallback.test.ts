/**
 * Vitest-compatible fallback eval — runs the same cases as
 * evals/triage/fallback.test.ts through vitest so they execute in CI.
 *
 * The standalone CLI runner (npx tsx evals/triage/fallback.test.ts) is kept
 * for ad-hoc use; this file mirrors it for automated CI runs.
 */
import { describe, it, expect } from 'vitest'
import { inferSpecialtyFromKeywords } from '@/lib/triage/specialties'

interface Case {
  id: string
  input: string
  expectedSpecialty: string | string[]
}

const cases: Case[] = [
  { id: 'back-pain-no-numbness', input: 'Mild lower back pain after sitting at desk all week, no numbness', expectedSpecialty: ['Orthopedics', 'General Medicine'] },
  { id: 'anxious-no-sleep',      input: 'I have been feeling anxious and not sleeping well for a month',     expectedSpecialty: 'Psychiatry' },
  { id: 'irregular-periods',     input: 'My periods have been irregular for the last few months',            expectedSpecialty: 'Gynecology' },
  { id: 'thyroid-signs',         input: 'Unexplained weight gain, cold intolerance and hair thinning',       expectedSpecialty: 'Endocrinology' },
  { id: 'multi-system',          input: 'I have a headache, stomach pain, joint pain and fever for 3 days',  expectedSpecialty: ['General Medicine', 'Emergency Medicine'] },
  { id: 'chest-pain',            input: 'Crushing chest pain radiating to my left arm',                      expectedSpecialty: ['Cardiology', 'Emergency Medicine'] },
  { id: 'acne',                  input: 'I have persistent acne on my face for months',                      expectedSpecialty: 'Dermatology' },
  { id: 'kidney-stone',          input: 'Severe pain in left flank radiating to groin, blood in urine',      expectedSpecialty: ['Urology', 'Nephrology'] },
  { id: 'newborn-jaundice',      input: 'My newborn baby skin and eyes look yellow on day 4',                expectedSpecialty: 'Pediatrics' },
  { id: 'asthma',                input: 'My asthma is bad, wheezing and short of breath',                    expectedSpecialty: 'Pulmonology' },
  { id: 'ear-infection',         input: 'My right ear has been painful and hearing feels muffled',           expectedSpecialty: 'ENT' },
  { id: 'no-chest-pain',         input: 'Mild fatigue, no chest pain, no shortness of breath',               expectedSpecialty: 'General Medicine' },
  { id: 'vague',                 input: 'I just feel unwell',                                                 expectedSpecialty: 'General Medicine' },
]

describe('Fallback eval — inferSpecialtyFromKeywords', () => {
  for (const c of cases) {
    it(c.id, () => {
      const actual = inferSpecialtyFromKeywords(c.input)
      const expected = Array.isArray(c.expectedSpecialty) ? c.expectedSpecialty : [c.expectedSpecialty]
      expect(expected).toContain(actual)
    })
  }
})
