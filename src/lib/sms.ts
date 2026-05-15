/**
 * Thin Twilio SMS wrapper. Fails soft — logs and returns false rather than
 * throwing, because callers (cron, fire-and-forget) shouldn't block on it.
 */
import twilio from 'twilio'

let cached: ReturnType<typeof twilio> | null = null

function client() {
  if (cached) return cached
  const sid = process.env.TWILIO_ACCOUNT_SID
  const tok = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !tok) return null
  cached = twilio(sid, tok)
  return cached
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_SMS_FROM
  const c    = client()
  if (!c || !from) {
    console.warn('[sms] creds missing — skipping send to', to)
    return false
  }
  try {
    await c.messages.create({ to, from, body })
    return true
  } catch (e) {
    console.error('[sms] send failed', e)
    return false
  }
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const from = process.env.TWILIO_WHATSAPP_FROM
  const c    = client()
  if (!c || !from) {
    console.warn('[whatsapp] creds missing — skipping send to', to)
    return false
  }
  try {
    await c.messages.create({
      to:   to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
      body,
    })
    return true
  } catch (e) {
    console.error('[whatsapp] send failed', e)
    return false
  }
}
