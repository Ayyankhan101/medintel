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
