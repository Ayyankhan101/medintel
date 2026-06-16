'use client'
import { useState } from 'react'
import {
  LiveKitRoom, ControlBar,
  useParticipants, useLocalParticipant,
  ParticipantLoop, ParticipantName,
} from '@livekit/components-react'
import '@livekit/components-styles'

interface Props {
  token: string
  roomName: string
  onCallEnd: () => void
}

function VideoGrid() {
  const participants = useParticipants()
  return (
    <ParticipantLoop participants={participants}>
      <div className="flex items-center justify-center bg-gray-800 rounded-lg min-h-[200px]">
        <ParticipantName />
      </div>
    </ParticipantLoop>
  )
}

function LocalVideo() {
  useLocalParticipant()
  return (
    <div className="w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
      <ParticipantName />
    </div>
  )
}

export function VideoCall({ token, roomName, onCallEnd }: Props) {
  const [connected, setConnected] = useState(false)

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
      <LiveKitRoom
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_HOST ?? ''}
        token={token}
        connect={true}
        onConnected={() => setConnected(true)}
        onDisconnected={onCallEnd}
        options={{ adaptiveStream: true }}
        video={true}
        audio={true}
        className="w-full h-full"
      >
        {connected && <VideoGrid />}

        <div className="absolute bottom-20 right-4 z-10">
          <LocalVideo />
        </div>

        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900/80 z-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Connecting to consultation room...</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <ControlBar
            controls={{ microphone: true, camera: true, screenShare: false, leave: true }}
          />
        </div>
      </LiveKitRoom>
    </div>
  )
}
