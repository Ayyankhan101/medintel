import { describe, it, expect } from 'vitest'
import { getEmergencyInstructions, isEmergencyScore } from '@/lib/emergency'

describe('isEmergencyScore', () => {
  it('returns true for score >= 8', () => {
    expect(isEmergencyScore(8)).toBe(true)
    expect(isEmergencyScore(10)).toBe(true)
  })
  it('returns false for score < 8', () => {
    expect(isEmergencyScore(7)).toBe(false)
    expect(isEmergencyScore(1)).toBe(false)
  })
})

describe('getEmergencyInstructions', () => {
  it('returns cardiology instructions for Cardiology', () => {
    const inst = getEmergencyInstructions('Cardiology')
    expect(inst.department).toBe('Cardiology')
    expect(inst.audio).toMatch(/aspirin/i)
    expect(inst.steps.length).toBeGreaterThan(0)
  })
  it('returns default instructions for unknown department', () => {
    const inst = getEmergencyInstructions('Dermatology')
    expect(inst.department).toBe('General')
    expect(inst.steps.length).toBeGreaterThan(0)
  })
  it('returns neurology instructions for Neurology', () => {
    const inst = getEmergencyInstructions('Neurology')
    expect(inst.audio).toMatch(/neurolog/i)
  })
})
