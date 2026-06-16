import { describe, it, expect } from 'vitest'
import { needsFollowup, FollowupOutput } from '@/lib/triage/followup'
import type { TriageOutput } from '@/lib/triage/agent'

function makeTriage(overrides: Partial<TriageOutput> = {}): TriageOutput {
  return {
    chiefComplaint: 'test',
    symptoms: ['pain'],
    duration: '2 days',
    redFlags: [],
    medicalTermSummary: 'test summary for unit test purposes',
    severityScore: 5,
    severityLevel: 'URGENT',
    specialty: 'General Medicine',
    confidence: 0.8,
    reasoning: 'test reason',
    ...overrides,
  }
}

describe('needsFollowup', () => {
  it('returns true when confidence is below floor', () => {
    expect(needsFollowup(makeTriage({ confidence: 0.5 }))).toBe(true)
  })

  it('returns true when symptoms are empty', () => {
    expect(needsFollowup(makeTriage({ symptoms: [] }))).toBe(true)
  })

  it('returns true when duration is unknown', () => {
    expect(needsFollowup(makeTriage({ duration: 'unknown' }))).toBe(true)
  })

  it('returns false when all conditions are met', () => {
    expect(needsFollowup(makeTriage())).toBe(false)
  })

  it('returns false when confidence equals floor exactly', () => {
    expect(needsFollowup(makeTriage({ confidence: 0.7 }))).toBe(false)
  })

  it('handles multiple simultaneous triggers', () => {
    expect(needsFollowup(makeTriage({ confidence: 0.3, symptoms: [], duration: 'unknown' }))).toBe(true)
  })
})

describe('FollowupOutput schema', () => {
  it('accepts valid followup output', () => {
    const valid = {
      questions: [
        { en: 'How long?', ur: 'کتنی دیر؟', slot: 'duration' },
      ],
    }
    expect(FollowupOutput.safeParse(valid).success).toBe(true)
  })

  it('accepts max 2 questions', () => {
    const valid = {
      questions: [
        { en: 'How long?', ur: 'کتنی دیر؟', slot: 'duration' },
        { en: 'How bad?', ur: 'کتنا برا؟', slot: 'severity' },
      ],
    }
    expect(FollowupOutput.safeParse(valid).success).toBe(true)
  })

  it('rejects empty questions array', () => {
    const invalid = { questions: [] }
    expect(FollowupOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects more than 2 questions', () => {
    const invalid = {
      questions: [
        { en: 'Q1?', ur: 'q1', slot: 'duration' },
        { en: 'Q2?', ur: 'q2', slot: 'severity' },
        { en: 'Q3?', ur: 'q3', slot: 'context' },
      ],
    }
    expect(FollowupOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects missing English text', () => {
    const invalid = { questions: [{ ur: 'کتنی دیر؟', slot: 'duration' }] }
    expect(FollowupOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects missing Urdu text', () => {
    const invalid = { questions: [{ en: 'How long?', slot: 'duration' }] }
    expect(FollowupOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects invalid slot value', () => {
    const invalid = {
      questions: [{ en: 'How long?', ur: 'کتنی دیر؟', slot: 'invalid' }],
    }
    expect(FollowupOutput.safeParse(invalid).success).toBe(false)
  })
})
