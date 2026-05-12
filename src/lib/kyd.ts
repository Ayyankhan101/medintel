import type { KYDVerifyResponse } from '@/types'

const isMockMode = (url: string | undefined) =>
  !url || url.includes('mock') || process.env.NODE_ENV === 'test'

export async function verifyDoctorTier1(governmentId: string): Promise<KYDVerifyResponse> {
  if (!governmentId) {
    return { tier: 1, passed: false, reason: 'Government ID is required' }
  }
  if (!/^\d{13}$/.test(governmentId)) {
    return { tier: 1, passed: false, reason: 'Government ID must be 13 digits' }
  }

  if (isMockMode(process.env.NADRA_API_URL)) {
    return { tier: 1, passed: true }
  }

  const res = await fetch(`${process.env.NADRA_API_URL}/verify`, {
    method: 'POST',
    headers: { 'X-API-Key': process.env.NADRA_API_KEY! },
    body: JSON.stringify({ cnic: governmentId }),
  })
  return res.ok
    ? { tier: 1, passed: true }
    : { tier: 1, passed: false, reason: 'NADRA service unavailable' }
}

export async function verifyDoctorTier2(licenseNumber: string): Promise<KYDVerifyResponse> {
  if (!licenseNumber) {
    return { tier: 2, passed: false, reason: 'License number is required' }
  }

  if (isMockMode(process.env.PMDC_API_URL)) {
    return { tier: 2, passed: true }
  }

  const res = await fetch(`${process.env.PMDC_API_URL}/verify-license`, {
    method: 'POST',
    headers: { 'X-API-Key': process.env.PMDC_API_KEY! },
    body: JSON.stringify({ license: licenseNumber }),
  })
  const data = await res.json()
  return data.active
    ? { tier: 2, passed: true }
    : { tier: 2, passed: false, reason: 'License not found or inactive in PMDC records' }
}

export function isDoctorFullyVerified(
  tier1At: Date | null,
  tier2At: Date | null,
  tier3At: Date | null
): boolean {
  return tier1At !== null && tier2At !== null && tier3At !== null
}
