/**
 * Twilio Programmable Voice — inbound call entry point.
 *
 * Wire-up: Twilio Console → Phone Number → "A call comes in" → POST
 *   https://<host>/api/voice-call/inbound
 *
 * TwiML flow:
 *   1. Greet in Urdu+English, ask the caller to describe symptoms.
 *   2. <Record action=/api/voice-call/record /> for up to 60s.
 *   3. Twilio POSTs the RecordingUrl back to /record (separate route);
 *      that route does Whisper → triage → SMS reply with a deep link.
 *
 * Signature verification: identical pattern to WhatsApp inbound.
 */

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export const dynamic = 'force-dynamic'

function twiml(xml: string): NextResponse {
  return new NextResponse(xml, { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}

function verify(req: NextRequest, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return process.env.NODE_ENV !== 'production'
  const sig = req.headers.get('x-twilio-signature')
  if (!sig) return false
  const url = process.env.TWILIO_WEBHOOK_URL ?? `${process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? ''}/api/voice-call/inbound`
  return twilio.validateRequest(token, sig, url, params)
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { if (typeof v === 'string') params[k] = v })

  if (!verify(req, params)) return new NextResponse('Forbidden', { status: 403 })

  const recordAction = `${process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? ''}/api/voice-call/record`

  return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-IN" voice="Polly.Aditi">Assalam-o-Alaikum. Welcome to Med Intel. After the beep, please describe your symptoms in Urdu or English. We will text you the next steps. Aap apni alamat batayein.</Say>
  <Record action="${recordAction}" method="POST" maxLength="60" timeout="3" playBeep="true" trim="trim-silence" finishOnKey="#"/>
  <Say>Sorry, we did not hear anything. Please call back. Khuda Hafiz.</Say>
</Response>`)
}
