/**
 * Twilio WhatsApp inbound webhook.
 *
 * Wire-up: Twilio Console → WhatsApp Sender → "When a message comes in" →
 *   POST https://<host>/api/whatsapp/inbound
 *
 * Request signing is verified with X-Twilio-Signature when TWILIO_AUTH_TOKEN
 * is set. Anonymous (signature-missing) requests are rejected in production.
 *
 * The webhook:
 *   1. Verifies the signature.
 *   2. Accepts either text (Body) or a voice note (MediaUrl0 with audio/*).
 *      Voice notes are downloaded once (Twilio media URLs require
 *      basic-auth with the account SID + auth token) and passed through Whisper.
 *   3. Runs the canonical triage agent.
 *   4. Replies with a short Urdu/English message:
 *      - severity, suggested specialty
 *      - a deep link to /intake?prefill= so the user can finish on web
 *   5. Returns TwiML — Twilio expects 200 OK XML.
 *
 * Privacy: we do NOT store transcripts in this webhook (the user has not
 * authenticated). The link drops them into the authenticated /intake flow
 * which writes to Triage with patientId.
 */

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { rateLimit } from '@/lib/rate-limit'
import { runTriageAgent } from '@/lib/triage/agent'
import { transcribeAudio } from '@/lib/openai'

export const dynamic = 'force-dynamic'

const TWIML_HEADERS = { 'content-type': 'text/xml; charset=utf-8' }

function twiml(text: string): NextResponse {
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`,
    { headers: TWIML_HEADERS },
  )
}

function verifySignature(req: NextRequest, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) {
    // Dev convenience — allow unsigned requests when no token is configured.
    return process.env.NODE_ENV !== 'production'
  }
  const sig = req.headers.get('x-twilio-signature')
  if (!sig) return false
  const url = process.env.TWILIO_WEBHOOK_URL ?? `${process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? ''}/api/whatsapp/inbound`
  return twilio.validateRequest(token, sig, url, params)
}

async function downloadMedia(url: string): Promise<Buffer> {
  const sid  = process.env.TWILIO_ACCOUNT_SID
  const tok  = process.env.TWILIO_AUTH_TOKEN
  const auth = sid && tok ? `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}` : ''
  const res = await fetch(url, { headers: auth ? { authorization: auth } : {} })
  if (!res.ok) throw new Error(`media fetch ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function reply(out: { severity: string; department: string; score: number }, baseUrl: string, original: string): string {
  const link = `${baseUrl}/intake?prefill=${encodeURIComponent(original).slice(0, 800)}`
  const urgentLine = out.score >= 8
    ? '⚠️ Possible emergency. If you cannot breathe, have chest pain, or are unresponsive, call 1122 NOW.\n\n'
    : ''
  return [
    urgentLine + 'MedIntel triage:',
    `Severity: ${out.severity} (${out.score}/10)`,
    `Suggested: ${out.department}`,
    '',
    `Continue securely & book a doctor:`,
    link,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'wa-inbound', max: 30, windowMs: 60_000 })
  if (!rl.ok) return twiml('Too many messages. Please wait a minute and try again.')

  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { if (typeof v === 'string') params[k] = v })

  if (!verifySignature(req, params)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const from     = params.From ?? ''
  const body     = (params.Body ?? '').trim()
  const numMedia = parseInt(params.NumMedia ?? '0', 10) || 0
  const mediaUrl = numMedia > 0 ? params.MediaUrl0      : null
  const mediaCt  = numMedia > 0 ? params.MediaContentType0 : ''

  let symptomText = body

  // Voice note → Whisper
  if (mediaUrl && mediaCt?.startsWith('audio/')) {
    try {
      const buf = await downloadMedia(mediaUrl)
      if (buf.byteLength > 16 * 1024 * 1024) {
        return twiml('Voice note is too large. Please keep it under 16 MB or type your symptoms.')
      }
      symptomText = await transcribeAudio(buf, 'whatsapp.ogg', 'ur')
    } catch (e) {
      console.error('[wa-inbound] media transcription failed', e)
      return twiml('Could not understand the voice note. Please type your symptoms.')
    }
  }

  if (!symptomText || symptomText.trim().length < 3) {
    return twiml('👋 Salam! Describe your symptoms in Urdu, Pashto, Punjabi, Sindhi, or English (a voice note works too).')
  }

  try {
    const { output } = await runTriageAgent(symptomText)
    const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://medintel.app'
    console.info('[wa-inbound]', { from, score: output.severityScore, dept: output.specialty, source: 'triage' })
    return twiml(reply({
      severity:   output.severityLevel,
      department: output.specialty,
      score:      output.severityScore,
    }, baseUrl, symptomText))
  } catch (e) {
    console.error('[wa-inbound] triage failed', e)
    return twiml('Sorry — our system is busy. Please try again in a minute or visit https://medintel.app/intake')
  }
}
