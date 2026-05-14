import { randomBytes } from 'node:crypto'
import type { KYCVerifyRequest, KYCVerifyResponse } from '@/types'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — Crockford-ish, easy to read

export function generateMedIntelCode(): string {
  const bytes = randomBytes(6)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return `MED-PK-${out.slice(0, 3)}-${out.slice(3, 6)}`
}

function isValidCNIC(cnic: string): boolean {
  return /^\d{13}$/.test(cnic)
}

export async function verifyPatientCNIC(req: KYCVerifyRequest): Promise<KYCVerifyResponse> {
  if (!isValidCNIC(req.cnicNumber)) {
    return { verified: false, medIntelCode: '', reason: 'CNIC must be 13 digits' }
  }

  // Mock branch is only allowed outside production. In prod, a missing NADRA
  // URL must fail closed — not auto-verify.
  const isMock =
    process.env.NODE_ENV === 'test' ||
    process.env.MOCK_KYC === 'true' ||
    (process.env.NODE_ENV !== 'production' && (!process.env.NADRA_API_URL || process.env.NADRA_API_URL.includes('mock')))

  if (isMock) {
    return { verified: true, medIntelCode: generateMedIntelCode() }
  }

  if (!process.env.NADRA_API_URL) {
    return { verified: false, medIntelCode: '', reason: 'KYC service not configured' }
  }

  const res = await fetch(`${process.env.NADRA_API_URL}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.NADRA_API_KEY!,
    },
    body: JSON.stringify({
      cnic: req.cnicNumber,
      name: req.fullName,
      dob: req.dateOfBirth,
    }),
  })

  if (!res.ok) {
    return { verified: false, medIntelCode: '', reason: 'NADRA verification service unavailable' }
  }

  const data = await res.json()
  if (!data.verified) {
    return { verified: false, medIntelCode: '', reason: 'CNIC details do not match NADRA records' }
  }

  return { verified: true, medIntelCode: generateMedIntelCode() }
}
