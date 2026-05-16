/**
 * Twilio recording callback. Twilio POSTs after <Record> finishes.
 *
 * Steps:
 *   1. Verify signature.
 *   2. Download the recording (Twilio media URLs need basic auth).
 *   3. Whisper transcribe.
 *   4. Run triage agent.
 *   5. SMS the caller back with severity, suggested specialty, and a
 *      deep link to /intake?prefill=...
 *   6. TwiML thanks the caller and hangs up.
 *
 * Privacy: nothing written to DB; the caller is unauthenticated.
 * The /intake link writes Triage rows only after the user signs in.
 *
 * Quota: if the inbound number matches a Clinic.voiceNumber, meter 1
 * minute of "voice" usage to that clinic.
 */
import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { runTriageAgent } from '@/lib/triage/agent'
import { transcribeAudio } from '@/lib/openai'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { meter } from '@/lib/clinic'

export const dynamic = 'force-dynamic'

const APP_URL = () => process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://medintel.app'

function twiml(xml: string): NextResponse {
  return new NextResponse(xml, { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}

function thankYou(message: string): NextResponse {
  return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${message.replace(/[<>&]/g, '')}</Say>
  <Hangup/>
</Response>`)
}

function verify(req: NextRequest, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return process.env.NODE_ENV === 'development'
  const sig = req.headers.get('x-twilio-signature')
  if (!sig) return false
  const url = process.env.TWILIO_WEBHOOK_URL ?? `${APP_URL()}/api/voice-call/record`
  return twilio.validateRequest(token, sig, url, params)
}

async function downloadRecording(url: string): Promise<Buffer> {
  // SSRF guard: only fetch Twilio media domains.
  let host = ''
  try { host = new URL(url).hostname } catch { throw new Error('invalid recording url') }
  if (!host.endsWith('.twilio.com') && host !== 'twilio.com') {
    throw new Error(`untrusted recording host: ${host}`)
  }
  const sid  = process.env.TWILIO_ACCOUNT_SID
  const tok  = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !tok) throw new Error('Twilio creds missing')
  const auth = `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}`
  // Twilio recordings need an extension to get a binary back; default is JSON metadata.
  const res = await fetch(`${url}.mp3`, { headers: { authorization: auth } })
  if (!res.ok) throw new Error(`recording fetch ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const tok   = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_SMS_FROM
  if (!sid || !tok || !from) {
    console.warn('[voice-call] SMS creds missing — skipping SMS to', to)
    return
  }
  const client = twilio(sid, tok)
  try {
    await client.messages.create({ to, from, body })
  } catch (e) {
    console.error('[voice-call] SMS send failed', e)
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'voice-record', max: 20, windowMs: 60_000 })
  if (!rl.ok) return thankYou('Too many calls. Please try again in a minute.')

  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { if (typeof v === 'string') params[k] = v })
  if (!verify(req, params)) return new NextResponse('Forbidden', { status: 403 })

  const from         = params.From ?? ''
  const to           = params.To   ?? ''
  const recordingUrl = params.RecordingUrl
  if (!recordingUrl) return thankYou('We could not capture your recording. Please call back.')

  // Quota check + clinic resolution
  const clinic = to ? await prisma.clinic.findFirst({ where: { voiceNumber: to, active: true } }) : null
  if (clinic && clinic.minutesUsed >= clinic.minutesQuota) {
    return thankYou('Clinic monthly quota exceeded. Please call back next month.')
  }

  try {
    const buf = await downloadRecording(recordingUrl)
    if (buf.byteLength > 25 * 1024 * 1024) {
      return thankYou('Recording too long. Please call back with a shorter message.')
    }
    const transcript = await transcribeAudio(buf, 'call.mp3', 'ur')
    if (!transcript || transcript.trim().length < 3) {
      return thankYou('We could not understand your message. Please call back.')
    }
    const { output } = await runTriageAgent(transcript)
    const link = `${APP_URL()}/intake?prefill=${encodeURIComponent(transcript).slice(0, 800)}`
    const urgent = output.severityScore >= 8 ? 'EMERGENCY: call 1122 now. ' : ''
    const body = `${urgent}MedIntel: severity ${output.severityLevel} (${output.severityScore}/10). Suggested: ${output.specialty}. Continue & book: ${link}`

    if (from) void sendSms(from, body)
    if (clinic) void meter(clinic.id, 'voice', 1, { from, score: output.severityScore })

    const summary = output.severityScore >= 8
      ? 'This may be an emergency. If you cannot breathe, are losing consciousness, or have chest pain, call eleven twenty-two now. We have texted you a link to book a doctor.'
      : 'Thank you. We have texted you a link with the suggested specialist. Khuda Hafiz.'
    return thankYou(summary)
  } catch (e) {
    console.error('[voice-call] pipeline failed', e)
    return thankYou('Sorry, our system is busy. Please try again in a minute.')
  }
}
