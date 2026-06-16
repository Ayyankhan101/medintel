import { describe, it, expect } from 'vitest'
import { TriageOutput } from '@/lib/triage/agent'

describe('TriageOutput schema', () => {
  it('accepts valid complete output', () => {
    const valid = {
      chiefComplaint: 'Chest pain for 2 days',
      symptoms: ['chest pain', 'shortness of breath'],
      duration: '2 days',
      redFlags: ['chest pain radiating to arm'],
      medicalTermSummary: 'Patient presents with chest pain and dyspnea for 2 days. Suspect cardiac origin.',
      severityScore: 7,
      severityLevel: 'URGENT',
      specialty: 'Cardiology',
      confidence: 0.85,
      reasoning: 'Cardiac symptoms with red flags suggest urgent cardiology review',
    }
    expect(TriageOutput.safeParse(valid).success).toBe(true)
  })

  it('applies default for missing optional fields', () => {
    const minimal = {
      chiefComplaint: 'Fever',
      symptoms: ['fever'],
      duration: '3 days',
      redFlags: [],
      medicalTermSummary: 'Patient has fever for 3 days. Likely viral infection.',
      severityScore: 3,
      severityLevel: 'ROUTINE',
      specialty: 'General Medicine',
    }
    const result = TriageOutput.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.confidence).toBe(0.7)
      expect(result.data.reasoning).toBe('')
    }
  })

  it('rejects severityScore outside 1-10', () => {
    const invalid = {
      chiefComplaint: 'Pain',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'test summary for unit test purposes which must be at least ten characters',
      severityScore: 15,
      severityLevel: 'ROUTINE',
      specialty: 'General Medicine',
      confidence: 0.8,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects severityScore below 1', () => {
    const invalid = {
      chiefComplaint: 'Pain',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'test summary for unit test purposes which must be at least ten characters',
      severityScore: 0,
      severityLevel: 'ROUTINE',
      specialty: 'General Medicine',
      confidence: 0.8,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects non-integer severityScore', () => {
    const invalid = {
      chiefComplaint: 'Pain',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'test summary for unit test purposes which must be at least ten characters',
      severityScore: 5.5,
      severityLevel: 'URGENT',
      specialty: 'General Medicine',
      confidence: 0.8,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects invalid severityLevel', () => {
    const invalid = {
      chiefComplaint: 'Pain',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'test summary for unit test purposes which must be at least ten characters',
      severityScore: 5,
      severityLevel: 'CRITICAL_BUT_WRONG',
      specialty: 'General Medicine',
      confidence: 0.8,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects chiefComplaint shorter than 2 chars', () => {
    const invalid = {
      chiefComplaint: 'A',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'test summary for unit test purposes which must be at least ten characters',
      severityScore: 5,
      severityLevel: 'URGENT',
      specialty: 'General Medicine',
      confidence: 0.8,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects medicalTermSummary shorter than 10 chars', () => {
    const invalid = {
      chiefComplaint: 'Chest pain',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'too short',
      severityScore: 5,
      severityLevel: 'URGENT',
      specialty: 'General Medicine',
      confidence: 0.8,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })

  it('rejects confidence outside 0-1 range', () => {
    const invalid = {
      chiefComplaint: 'Pain',
      symptoms: ['pain'],
      duration: '1 day',
      redFlags: [],
      medicalTermSummary: 'test summary for unit test purposes which must be at least ten characters',
      severityScore: 5,
      severityLevel: 'URGENT',
      specialty: 'General Medicine',
      confidence: 1.5,
      reasoning: 'test',
    }
    expect(TriageOutput.safeParse(invalid).success).toBe(false)
  })
})
