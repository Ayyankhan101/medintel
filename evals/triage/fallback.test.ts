/**
 * Unit test for the deterministic fallback path. Doesn't call any LLM —
 * exercises only inferSpecialtyFromKeywords + the agent's keyword severity
 * scorer. Cheap, fast, runs offline.
 *
 * Usage:
 *   npx tsx evals/triage/fallback.test.ts
 *
 * Exits 1 on any failure. Wire into CI without burning Groq tokens.
 */

import { inferSpecialtyFromKeywords } from '../../src/lib/triage/specialties.ts'

interface Case {
  id:                string
  input:             string
  expectedSpecialty: string | string[]
}

const cases: Case[] = [
  // Regressions surfaced by the live-LLM eval — must pass on the fallback alone:
  { id: 'back-pain-no-numbness', input: 'Mild lower back pain after sitting at desk all week, no numbness', expectedSpecialty: ['Orthopedics', 'General Medicine'] },
  { id: 'anxious-no-sleep',      input: 'I have been feeling anxious and not sleeping well for a month',     expectedSpecialty: 'Psychiatry' },
  { id: 'irregular-periods',     input: 'My periods have been irregular for the last few months',            expectedSpecialty: 'Gynecology' },
  { id: 'thyroid-signs',         input: 'Unexplained weight gain, cold intolerance and hair thinning',       expectedSpecialty: 'Endocrinology' },
  { id: 'multi-system',          input: 'I have a headache, stomach pain, joint pain and fever for 3 days',  expectedSpecialty: ['General Medicine', 'Emergency Medicine'] },

  // Confirm the obvious cases still route correctly:
  { id: 'chest-pain',            input: 'Crushing chest pain radiating to my left arm',                      expectedSpecialty: ['Cardiology', 'Emergency Medicine'] },
  { id: 'acne',                  input: 'I have persistent acne on my face for months',                      expectedSpecialty: 'Dermatology' },
  { id: 'kidney-stone',          input: 'Severe pain in left flank radiating to groin, blood in urine',      expectedSpecialty: ['Urology', 'Nephrology'] },
  { id: 'newborn-jaundice',      input: 'My newborn baby skin and eyes look yellow on day 4',                expectedSpecialty: 'Pediatrics' },
  { id: 'asthma',                input: 'My asthma is bad, wheezing and short of breath',                    expectedSpecialty: 'Pulmonology' },
  { id: 'ear-infection',         input: 'My right ear has been painful and hearing feels muffled',           expectedSpecialty: 'ENT' },

  // Negation: "no chest pain" should NOT route to Cardiology
  { id: 'no-chest-pain',         input: 'Mild fatigue, no chest pain, no shortness of breath',               expectedSpecialty: 'General Medicine' },

  // Vague → General
  { id: 'vague',                 input: 'I just feel unwell',                                                 expectedSpecialty: 'General Medicine' },
]

function color(c: 'red' | 'green' | 'gray', s: string): string {
  const codes = { red: 31, green: 32, gray: 90 }
  return process.stdout.isTTY ? `\x1b[${codes[c]}m${s}\x1b[0m` : s
}

let pass = 0
let fail = 0
const failures: string[] = []

for (const c of cases) {
  const actual = inferSpecialtyFromKeywords(c.input)
  const expected = Array.isArray(c.expectedSpecialty) ? c.expectedSpecialty : [c.expectedSpecialty]
  const ok = expected.includes(actual)
  if (ok) {
    pass++
    console.log(color('green', '✓'), c.id.padEnd(28), '→', actual)
  } else {
    fail++
    const msg = `${c.id.padEnd(28)} → ${actual}  (expected one of: ${expected.join(', ')})`
    failures.push(msg)
    console.log(color('red', '✕'), msg)
  }
}

console.log('─'.repeat(70))
console.log(`pass: ${pass}/${cases.length}   fail: ${fail}`)
if (fail > 0) process.exit(1)
