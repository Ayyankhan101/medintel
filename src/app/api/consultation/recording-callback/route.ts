/**
 * POST /api/consultation/recording-callback
 *
 * Twilio Video RecordingStatusCallback webhook.
 *
 * Wire-up: configure on the Twilio Video Room (RecordingRules + StatusCallback)
 * to point here. Twilio POSTs form-encoded payloads with at least:
 *   RoomSid, RecordingSid, RecordingStatus, RecordingUri, MediaType
 *
 * Why this exists:
 *   The PMDC consent workflow already gates recording (recordingConsentAt).
 *   But before this route, recording lifecycle events were silently dropped —
 *   no audit, no record of who recorded what when. This handler:
 *     1. Verifies the Twilio signature so attackers can't forge events.
 *     2. Resolves the appointment from the RoomSid (room name = `medintel-<id>`).
 *     3. Writes an audit row tagged with the RecordingSid + status.
 *
 * Storage: we do NOT pull the recording bytes here. They stay in Twilio's
 * Composition storage with the retention policy configured at the Room level.
 * Pulling into S3/Blob is a follow-up (needs a dedicated retention review).
 */
import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function appointmentIdFromRoomName(roomName: string | null): string | null {
  if (!roomName || !roomName.startsWith('medintel-')) return null
  return roomName.slice('medintel-'.length)
}

export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = req.headers.get('x-twilio-signature') ?? ''
  if (!authToken) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  // Read body as form-encoded — Twilio always sends application/x-www-form-urlencoded.
  const raw = await req.text()
  const params = Object.fromEntries(new URLSearchParams(raw))

  // Signature is HMAC-SHA1 over the full URL + sorted key/value concatenation.
  // The full URL must match Twilio's callback config (NEXTAUTH_URL + path).
  const url = `${process.env.NEXTAUTH_URL ?? req.nextUrl.origin}${req.nextUrl.pathname}`
  const valid = twilio.validateRequest(authToken, signature, url, params)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid Twilio signature' }, { status: 401 })
  }

  const roomName       = (params.RoomName as string) ?? null
  const recordingSid   = (params.RecordingSid as string) ?? null
  const recordingState = (params.RecordingStatus as string) ?? 'unknown'
  const appointmentId  = appointmentIdFromRoomName(roomName)

  // Always audit — even if we can't resolve the appointment — so ops can
  // reconcile orphan recordings manually.
  void audit('consultation.recording_event', 'Appointment', appointmentId ?? roomName ?? 'unknown', {
    actorRole: 'SYSTEM',
    provider:  'twilio',
    roomName,
    recordingSid,
    state:     recordingState,
  })

  // Touch the appointment so admins can see "recording exists" without
  // querying Twilio. We only persist when both IDs are present and resolvable.
  if (appointmentId && recordingSid) {
    try {
      const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
      if (appt && appt.recordingConsentAt) {
        // No dedicated column — store in audit only. A future migration can
        // add Appointment.recordingSid / recordingStatus once we commit to a
        // retention policy.
      }
    } catch (e) {
      console.error('[recording-callback] lookup failed', e)
    }
  }

  return NextResponse.json({ ok: true })
}
