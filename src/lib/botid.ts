/**
 * Vercel BotID — lightweight bot-detection check for high-value forms
 * (register, forgot-password, clinic register). GA since June 2025.
 *
 * Implementation strategy:
 *   - Read the `x-vercel-botid` header that Vercel injects into requests on
 *     deployments where BotID is enabled.
 *   - If it's absent (local dev, BotID not enabled on the project), pass.
 *   - If it's present with value 'allow', pass.
 *   - If it's 'challenge' / 'deny', reject with 403.
 *
 * This stays a tiny shim so we can swap to the official @vercel/botid SDK
 * once we pin it as a dep, without touching call sites.
 */
import type { NextRequest } from 'next/server'

export type BotIdVerdict = 'allow' | 'challenge' | 'deny' | 'unknown'

export function readBotIdVerdict(req: NextRequest): BotIdVerdict {
  const raw = req.headers.get('x-vercel-botid')?.toLowerCase()
  if (!raw) return 'unknown'
  if (raw === 'allow' || raw === 'challenge' || raw === 'deny') return raw
  return 'unknown'
}

export interface BotIdGuardResult {
  allowed: boolean
  reason?: string
}

/**
 * Default policy: block 'deny'. 'challenge' is also blocked for now —
 * we don't have a challenge UI yet, so treating it as a soft deny is the
 * safer behavior for credential forms.
 */
export function botIdGuard(req: NextRequest): BotIdGuardResult {
  const verdict = readBotIdVerdict(req)
  if (verdict === 'deny')      return { allowed: false, reason: 'Bot detected by Vercel BotID' }
  if (verdict === 'challenge') return { allowed: false, reason: 'Additional verification required' }
  // 'allow' and 'unknown' (local dev / BotID disabled) both pass.
  return { allowed: true }
}
