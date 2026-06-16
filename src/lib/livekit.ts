import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

const API_KEY   = process.env.LIVEKIT_API_KEY!
const API_SECRET = process.env.LIVEKIT_API_SECRET!
const HOST      = process.env.LIVEKIT_URL!

export async function generateVideoToken(identity: string, roomName: string): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, { identity, ttl: '1h' })
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  return at.toJwt()
}

export function appointmentRoomName(appointmentId: string): string {
  return `medintel-${appointmentId}`
}

export async function completeVideoRoom(roomName: string): Promise<void> {
  if (!API_KEY || !API_SECRET || !HOST) return

  const client = new RoomServiceClient(HOST, API_KEY, API_SECRET)
  try {
    await client.deleteRoom(roomName)
  } catch (e: unknown) {
    // LiveKit throws if room doesn't exist — safe to ignore (never started or already deleted).
    if (typeof e === 'object' && e !== null && 'status' in e && (e as { status: number }).status === 404) return
    console.error('[livekit] completeVideoRoom failed', roomName, e)
  }
}
