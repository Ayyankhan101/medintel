import { describe, it, expect } from 'vitest'
import { formatAmountForStripe, formatAmountFromStripe, isAutoRefundEligible } from '@/lib/stripe'

describe('formatAmountForStripe', () => {
  // PKR is a zero-decimal currency — 1500 PKR is sent as 1500, not 150000.
  it('rounds to whole rupees (PKR is zero-decimal in Stripe)', () => {
    expect(formatAmountForStripe(20)).toBe(20)
    expect(formatAmountForStripe(20.50)).toBe(21)
    expect(formatAmountForStripe(0.99)).toBe(1)
    expect(formatAmountForStripe(1500)).toBe(1500)
  })
})

describe('formatAmountFromStripe', () => {
  it('is identity for PKR (zero-decimal)', () => {
    expect(formatAmountFromStripe(2000)).toBe(2000)
    expect(formatAmountFromStripe(1500)).toBe(1500)
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
