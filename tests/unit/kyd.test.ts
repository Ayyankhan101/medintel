import { describe, it, expect, vi } from 'vitest'
import { verifyDoctorTier1, verifyDoctorTier2, isDoctorFullyVerified } from '@/lib/kyd'

describe('verifyDoctorTier1 (Government ID)', () => {
  it('rejects empty government ID', async () => {
    const result = await verifyDoctorTier1('')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('required')
  })

  it('passes with valid 13-digit ID in mock mode', async () => {
    vi.stubEnv('NADRA_API_URL', 'http://localhost/mock')
    const result = await verifyDoctorTier1('3520212345679')
    expect(result.passed).toBe(true)
    expect(result.tier).toBe(1)
  })
})

describe('verifyDoctorTier2 (Medical License)', () => {
  it('rejects empty license number', async () => {
    const result = await verifyDoctorTier2('')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('required')
  })

  it('passes with valid license in mock mode', async () => {
    vi.stubEnv('PMDC_API_URL', 'http://localhost/mock')
    const result = await verifyDoctorTier2('PMDC-12345')
    expect(result.passed).toBe(true)
    expect(result.tier).toBe(2)
  })
})

describe('isDoctorFullyVerified', () => {
  it('returns false if any tier is missing', () => {
    expect(isDoctorFullyVerified(null, new Date(), new Date())).toBe(false)
    expect(isDoctorFullyVerified(new Date(), null, new Date())).toBe(false)
    expect(isDoctorFullyVerified(new Date(), new Date(), null)).toBe(false)
  })

  it('returns true when all three tiers are verified', () => {
    const d = new Date()
    expect(isDoctorFullyVerified(d, d, d)).toBe(true)
  })
})
