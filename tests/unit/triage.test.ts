import { describe, it, expect } from 'vitest'
import { computeSeverityLevel, computeScore, mapDepartment } from '@/lib/triage'

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
