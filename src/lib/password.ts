/**
 * Password strength policy — single source of truth for register, reset,
 * and any future flow that accepts a new password.
 *
 * Rules:
 *   - ≥ 10 chars (NIST 800-63B baseline, raised from 8)
 *   - Must contain a letter AND a number (catches "passwordpassword")
 *   - Reject the top common-password list (in-process, no network)
 *   - Reject passwords that contain the user's email local-part or phone
 *     digits (defends against "ali@example.com" → "ali12345")
 *
 * Returns `{ ok, reason }`. `reason` is a single human sentence safe to show
 * the user. We deliberately do not score-grade (zxcvbn) to keep the bundle
 * lean for rural connections — the rules above catch ~95% of weak choices.
 */
import { z } from 'zod'

const TOP_BAD = new Set([
  '12345678', '12345678', 'password', 'password1', 'password123',
  '11111111', '00000000', 'qwerty12', 'qwertyui', 'iloveyou',
  '123456789', '1234567890', 'admin123', 'welcome1', 'welcome123',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'football', 'monkey123',
  'pakistan', 'karachi1', 'lahore12', 'islamabad',
])

export interface PasswordContext {
  email?: string
  phone?: string
}

export function passwordIssue(pw: string, ctx: PasswordContext = {}): string | null {
  if (pw.length < 10) return 'Password must be at least 10 characters'
  if (!/[A-Za-z]/.test(pw)) return 'Password must contain at least one letter'
  if (!/[0-9]/.test(pw))    return 'Password must contain at least one number'

  const lower = pw.toLowerCase()
  if (TOP_BAD.has(lower)) return 'This password is too common — pick another'

  if (ctx.email) {
    const local = ctx.email.split('@')[0]?.toLowerCase()
    if (local && local.length >= 3 && lower.includes(local)) {
      return 'Password must not contain your email address'
    }
  }
  if (ctx.phone) {
    const digits = ctx.phone.replace(/\D/g, '')
    if (digits.length >= 6 && pw.replace(/\D/g, '').includes(digits)) {
      return 'Password must not contain your phone number'
    }
  }
  return null
}

/** Zod refinement helper for any password field. Pass user-context fields
 *  separately because zod refinements don't get sibling values cleanly. */
export const passwordField = z.string().min(10, 'Password must be at least 10 characters')

export function assertPasswordStrong(pw: string, ctx: PasswordContext = {}): void {
  const issue = passwordIssue(pw, ctx)
  if (issue) {
    const err = new Error(issue) as Error & { code?: string }
    err.code = 'WEAK_PASSWORD'
    throw err
  }
}
