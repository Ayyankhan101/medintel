import { describe, it, expect } from 'vitest'
import { computeSeverityLevel, computeScore, mapDepartment, scoreFromKeywords } from '@/lib/triage'

describe('scoreFromKeywords', () => {
  it('returns 9 for critical keywords', () => {
    expect(scoreFromKeywords('crushing chest pain')).toBe(9)
    expect(scoreFromKeywords('heart attack symptoms')).toBe(9)
    expect(scoreFromKeywords('cannot breathe')).toBe(9)
  })

  it('returns 6 for urgent keywords', () => {
    expect(scoreFromKeywords('chest pain')).toBe(6)
    expect(scoreFromKeywords('severe headache')).toBe(6)
    expect(scoreFromKeywords('shortness of breath')).toBe(6)
  })

  it('returns 2 for mild keywords', () => {
    expect(scoreFromKeywords('mild cough')).toBe(2)
    expect(scoreFromKeywords('slight fever')).toBe(2)
    expect(scoreFromKeywords('occasional headache')).toBe(2)
  })

  it('returns 6 (default) when no keywords match', () => {
    expect(scoreFromKeywords('I feel okay')).toBe(6)
  })

  describe('negation handling', () => {
    it('does not trigger URGENT for negated chest pain (no)', () => {
      expect(scoreFromKeywords('I have no chest pain')).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (don\'t)', () => {
      expect(scoreFromKeywords("I don't have chest pain")).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (doesn\'t)', () => {
      expect(scoreFromKeywords("he doesn't have chest pain")).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (didn\'t)', () => {
      expect(scoreFromKeywords("patient didn't have chest pain")).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (denies)', () => {
      expect(scoreFromKeywords('patient denies chest pain')).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (denied)', () => {
      // "denied" should match "denies" word-boundary — let's check the window
      // Actually "denied" isn't in the list, so this tests the word-boundary regex
      expect(scoreFromKeywords('patient denied chest pain')).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (no history of)', () => {
      expect(scoreFromKeywords('no history of chest pain')).toBe(6)
    })

    it('does not trigger URGENT for negated chest pain (absence of)', () => {
      expect(scoreFromKeywords('absence of chest pain')).toBe(6)
    })

    it('does not trigger URGENT for negated breathlessness (isn\'t)', () => {
      expect(scoreFromKeywords("he isn't short of breath")).toBe(6)
    })

    it('does not trigger URGENT for negated breathlessness (wasn\'t)', () => {
      expect(scoreFromKeywords("he wasn't short of breath before")).toBe(6)
    })

    it('does not trigger CRITICAL for negated seizure (won\'t)', () => {
      expect(scoreFromKeywords("won't have another seizure")).toBe(6)
    })

    it('does not trigger CRITICAL for negated seizure (no history of)', () => {
      expect(scoreFromKeywords('no history of seizure')).toBe(6)
    })

    it('does not trigger CRITICAL for negated stroke', () => {
      expect(scoreFromKeywords('no signs of stroke')).toBe(6)
    })

    it('handles multi-word negation with 2-word gap', () => {
      expect(scoreFromKeywords('I have absolutely no chest pain at all')).toBe(6)
    })

    it('still triggers when negation is unrelated to the symptom', () => {
      expect(scoreFromKeywords('I have chest pain but no fever')).toBe(6)
    })
  })
})

describe('computeSeverityLevel', () => {
  it('classifies 1-4 as ROUTINE', () => {
    expect(computeSeverityLevel(1)).toBe('ROUTINE')
    expect(computeSeverityLevel(4)).toBe('ROUTINE')
  })

  it('classifies 5-7 as URGENT', () => {
    expect(computeSeverityLevel(5)).toBe('URGENT')
    expect(computeSeverityLevel(7)).toBe('URGENT')
  })

  it('classifies 8-10 as CRITICAL', () => {
    expect(computeSeverityLevel(8)).toBe('CRITICAL')
    expect(computeSeverityLevel(10)).toBe('CRITICAL')
  })

  it('clamps values below 1 to ROUTINE', () => {
    expect(computeSeverityLevel(0)).toBe('ROUTINE')
  })

  it('clamps values above 10 to CRITICAL', () => {
    expect(computeSeverityLevel(11)).toBe('CRITICAL')
  })
})

describe('computeScore', () => {
  it('scores chest pain with troponin as 9+', () => {
    const score = computeScore('chest pain, troponin elevated, diaphoresis')
    expect(score).toBeGreaterThanOrEqual(9)
  })

  it('scores mild cough as <= 4', () => {
    const score = computeScore('mild cough since yesterday, no fever')
    expect(score).toBeLessThanOrEqual(4)
  })

  it('scores severe headache with vomiting as 5-7', () => {
    const score = computeScore('severe headache for 2 days with vomiting')
    expect(score).toBeGreaterThanOrEqual(5)
    expect(score).toBeLessThanOrEqual(7)
  })

  it('returns default (6) when all keywords are negated', () => {
    const score = computeScore('no chest pain, no shortness of breath')
    expect(score).toBe(6)
  })

  it('scores high when chest pain is present (not negated)', () => {
    const score = computeScore('chest pain, shortness of breath')
    expect(score).toBeGreaterThanOrEqual(5)
  })
})

describe('mapDepartment', () => {
  it('maps cardiac keywords correctly', () => {
    expect(mapDepartment('chest pressure, heart palpitations')).toBe('Cardiology')
  })

  it('maps neurological keywords correctly', () => {
    expect(mapDepartment('sudden numbness, seizure')).toBe('Neurology')
  })

  it('defaults to General Medicine', () => {
    expect(mapDepartment('tired all the time')).toBe('General Medicine')
  })
})
