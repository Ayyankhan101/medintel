import { randomBytes } from 'crypto'

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export const EMAIL_VERIFY_TTL_MS    = 24 * 60 * 60_000
export const PASSWORD_RESET_TTL_MS  =      60 * 60_000
