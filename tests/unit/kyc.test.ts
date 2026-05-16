import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyPatientCNIC, generateMedIntelCode } from '@/lib/kyc'

describe('generateMedIntelCode', () => {
  it('generates code with MED-PK- prefix', () => {
    const code = generateMedIntelCode()
    // Format: MED-PK-XXX-XXX with Crockford-ish alphabet (no 0/O/1/I).
    expect(code).toMatch(/^MED-PK-[A-Z2-9]{3}-[A-Z2-9]{3}$/)
  })

  it('generates unique codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateMedIntelCode()))
    expect(codes.size).toBeGreaterThan(50)
  })
})

describe('verifyPatientCNIC', () => {
  beforeEach(() => {
    vi.stubEnv('NADRA_API_URL', 'http://localhost:3001/mock/nadra')
    vi.stubEnv('NADRA_API_KEY', 'mock-key')
  })

  it('rejects CNICs that are not 13 digits', async () => {
    const result = await verifyPatientCNIC({
      cnicNumber: '12345',
      fullName: 'Test User',
      dateOfBirth: '1990-01-01',
    })
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('CNIC must be 13 digits')
  })

  it('rejects CNICs with non-numeric characters', async () => {
    const result = await verifyPatientCNIC({
      cnicNumber: '352021234567X',
      fullName: 'Test User',
      dateOfBirth: '1990-01-01',
    })
    expect(result.verified).toBe(false)
    expect(result.reason).toBe('CNIC must be 13 digits')
  })
})
