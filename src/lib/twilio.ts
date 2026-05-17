import twilio from 'twilio'

const AccessToken = twilio.jwt.AccessToken
const VideoGrant  = AccessToken.VideoGrant

export function generateVideoToken(identity: string, roomName: string): string {
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY_SID!,
    process.env.TWILIO_API_KEY_SECRET!,
    { identity, ttl: 3600 }
  )
  token.addGrant(new VideoGrant({ room: roomName }))
  return token.toJwt()
}

export function appointmentRoomName(appointmentId: string): string {
  return `medintel-${appointmentId}`
}

export async function completeVideoRoom(roomName: string): Promise<void> {
  const sid    = process.env.TWILIO_ACCOUNT_SID
  const keySid = process.env.TWILIO_API_KEY_SID
  const secret = process.env.TWILIO_API_KEY_SECRET
  if (!sid || !keySid || !secret) return

  const c = twilio(keySid, secret, { accountSid: sid })
  try {
    await c.video.v1.rooms(roomName).update({ status: 'completed' })
  } catch (e: unknown) {
    // 20404 = room not found (never started or already torn down)
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: number }).code === 20404) return
    console.error('[twilio] completeVideoRoom failed', roomName, e)
  }
}
