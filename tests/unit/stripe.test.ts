import { describe, it, expect } from 'vitest'
import { formatAmountForStripe, formatAmountFromStripe, isAutoRefundEligible } from '@/lib/stripe'

describe('formatAmountForStripe', () => {
  it('converts dollars to cents', () => {
    expect(formatAmountForStripe(20)).toBe(2000)
    expect(formatAmountForStripe(20.50)).toBe(2050)
    expect(formatAmountForStripe(0.99)).toBe(99)
  })
})

describe('formatAmountFromStripe', () => {
  it('converts cents to dollars', () => {
    expect(formatAmountFromStripe(2000)).toBe(20)
    expect(formatAmountFromStripe(2050)).toBe(20.50)
  })
})

describe('isAutoRefundEligible', () => {
  it('returns true if appointment is more than 2 hours past scheduled time', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(isAutoRefundEligible(threeHoursAgo, 'SCHEDULED')).toBe(true)
  })

  it('returns false if appointment is within 2 hours', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    expect(isAutoRefundEligible(oneHourAgo, 'SCHEDULED')).toBe(false)
  })

  it('returns false if appointment is completed', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(isAutoRefundEligible(threeHoursAgo, 'COMPLETED')).toBe(false)
  })
})
