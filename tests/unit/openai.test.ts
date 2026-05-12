import { describe, it, expect } from 'vitest'
import { buildMedicalSummaryPrompt, parseDepartmentFromSummary, parseSeverityFromText } from '@/lib/openai'

describe('buildMedicalSummaryPrompt', () => {
  it('includes the transcript in the prompt', () => {
    const prompt = buildMedicalSummaryPrompt('chest pain and sweating')
    expect(prompt).toContain('chest pain and sweating')
  })

  it('asks for structured JSON output', () => {
    const prompt = buildMedicalSummaryPrompt('headache')
    expect(prompt).toContain('JSON')
  })
})

describe('parseDepartmentFromSummary', () => {
  it('maps chest/heart keywords to Cardiology', () => {
    expect(parseDepartmentFromSummary('chest pressure, diaphoresis')).toBe('Cardiology')
    expect(parseDepartmentFromSummary('heart palpitations')).toBe('Cardiology')
  })

  it('maps brain/numbness to Neurology', () => {
    expect(parseDepartmentFromSummary('sudden numbness in arm')).toBe('Neurology')
    expect(parseDepartmentFromSummary('seizure and confusion')).toBe('Neurology')
  })

  it('maps fever/cough to General Medicine when no specialist match', () => {
    expect(parseDepartmentFromSummary('mild fever and cough')).toBe('General Medicine')
  })
})

describe('parseSeverityFromText', () => {
  it('returns a number between 1 and 10', () => {
    const score = parseSeverityFromText('mild headache since morning')
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
  })
})
