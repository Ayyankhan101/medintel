import 'next-auth'
import 'next-auth/jwt'

type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'CLINIC_ADMIN'
type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: Role
      medIntelCode: string
      kycStatus: KycStatus
    }
  }

  interface User {
    role: Role
    medIntelCode: string
    kycStatus: KycStatus
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    medIntelCode: string
    kycStatus: KycStatus
  }
}
