import { describe, it, expect } from 'vitest'
import { computeDoctorScore } from '@/lib/doctor-scoring'

const baseDoctor = {
  languages: [],
  tier: 'JUNIOR',
  rating: null,
  reviewCount: 0,
}

describe('computeDoctorScore', () => {
  it('returns 1.0 base score with no bonuses', () => {
    expect(computeDoctorScore({ doctor: baseDoctor })).toBe(1)
  })

  it('applies 1.5x language match bonus', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, languages: ['urdu', 'english'] },
      language: 'urdu',
    })
    expect(score).toBe(1.5)
  })

  it('does not apply language bonus when no match', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, languages: ['urdu', 'english'] },
      language: 'pashto',
    })
    expect(score).toBe(1)
  })

  it('is case-insensitive for language matching', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, languages: ['Urdu', 'English'] },
      language: 'urdu',
    })
    expect(score).toBe(1.5)
  })

  it('applies 1.3x senior bonus for severity >= 7', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, tier: 'SENIOR' },
      severity: 8,
    })
    expect(score).toBe(1.3)
  })

  it('does not apply senior bonus for low severity', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, tier: 'SENIOR' },
      severity: 3,
    })
    expect(score).toBe(1)
  })

  it('does not apply senior bonus for JUNIOR doctor at high severity', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, tier: 'JUNIOR' },
      severity: 8,
    })
    expect(score).toBe(1)
  })

  it('applies rating bonus up to 1.1x for perfect 5.0', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, rating: 5.0 },
    })
    expect(score).toBeCloseTo(1.1, 2)
  })

  it('applies partial rating bonus for lower ratings', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, rating: 3.0 },
    })
    expect(score).toBeCloseTo(1.06, 2)
  })

  it('applies 1.05x bonus for 50+ reviews', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, reviewCount: 50 },
    })
    expect(score).toBe(1.05)
  })

  it('applies 1.02x bonus for 10+ reviews', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, reviewCount: 10 },
    })
    expect(score).toBe(1.02)
  })

  it('does not apply review bonus for fewer than 10 reviews', () => {
    const score = computeDoctorScore({
      doctor: { ...baseDoctor, reviewCount: 5 },
    })
    expect(score).toBe(1)
  })

  it('combines multiple bonuses multiplicatively', () => {
    const score = computeDoctorScore({
      doctor: {
        languages: ['urdu'],
        tier: 'SENIOR',
        rating: 5.0,
        reviewCount: 50,
      },
      language: 'urdu',
      severity: 8,
    })
    // 1.5 (lang) * 1.3 (senior) * 1.1 (rating) * 1.05 (reviews)
    expect(score).toBeCloseTo(1.5 * 1.3 * 1.1 * 1.05, 2)
  })
})
