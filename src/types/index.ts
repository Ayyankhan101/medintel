export interface MedIntelUser {
  id: string
  email: string
  phone: string
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN'
  medIntelCode: string | null
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
}

export interface KYCVerifyRequest {
  cnicNumber: string
  fullName: string
  dateOfBirth: string
}

export interface KYCVerifyResponse {
  verified: boolean
  medIntelCode: string
  reason?: string
}

export interface KYDVerifyRequest {
  licenseNumber: string
  governmentIdNumber: string
  degreeDocumentUrl: string
}

export interface KYDVerifyResponse {
  tier: 1 | 2 | 3
  passed: boolean
  reason?: string
}

export interface TriageResult {
  department: string
  severityScore: number
  severityLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL'
  summary: string
  isEmergency: boolean
}

export interface NearbyResource {
  id: string
  name: string
  type: string
  address: string
  latitude: number
  longitude: number
  distanceKm: number
  phone: string | null
}
