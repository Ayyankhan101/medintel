'use client'
import { useEffect, useRef, useState } from 'react'
import type {
  Room, RemoteParticipant,
  LocalVideoTrack, RemoteVideoTrack,
  LocalAudioTrack, RemoteAudioTrack,
} from 'twilio-video'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react'

interface Props {
  token: string
  roomName: string
  onCallEnd: () => void
}

export function VideoCall({ token, roomName, onCallEnd }: Props) {
  const [room, setRoom]         = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn]       = useState(true)
  const [camOn, setCamOn]       = useState(true)
  const localRef  = useRef<HTMLDivElement>(null)
  const remoteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let activeRoom: Room

    async function connect() {
      const TwilioVideo = (await import('twilio-video')).default
      activeRoom = await TwilioVideo.connect(token, {
        name:  roomName,
        audio: true,
        video: { width: 640, height: 480 },
      })
      setRoom(activeRoom)
      setConnected(true)

      activeRoom.localParticipant.videoTracks.forEach(pub => {
        if (pub.track && localRef.current)
          localRef.current.appendChild((pub.track as LocalVideoTrack).attach())
      })

      activeRoom.participants.forEach(attachParticipant)
      activeRoom.on('participantConnected',    attachParticipant)
      activeRoom.on('participantDisconnected', detachParticipant)
    }

    function attachParticipant(p: RemoteParticipant) {
      p.tracks.forEach(pub => {
        if (pub.isSubscribed && pub.track && remoteRef.current)
          remoteRef.current.appendChild((pub.track as RemoteVideoTrack | RemoteAudioTrack).attach())
      })
      p.on('trackSubscribed', track => {
        if (remoteRef.current)
          remoteRef.current.appendChild((track as RemoteVideoTrack | RemoteAudioTrack).attach())
      })
    }

    function detachParticipant(p: RemoteParticipant) {
      p.tracks.forEach(pub => {
        if (pub.track)
          (pub.track as RemoteVideoTrack | RemoteAudioTrack).detach().forEach(el => el.remove())
      })
    }

    connect()
    return () => { activeRoom?.disconnect() }
  }, [token, roomName])

  function toggleMic() {
    room?.localParticipant.audioTracks.forEach(pub => {
      micOn
        ? (pub.track as LocalAudioTrack).disable()
        : (pub.track as LocalAudioTrack).enable()
    })
    setMicOn(v => !v)
  }

  function toggleCam() {
    room?.localParticipant.videoTracks.forEach(pub => {
      camOn
        ? (pub.track as LocalVideoTrack).disable()
        : (pub.track as LocalVideoTrack).enable()
    })
    setCamOn(v => !v)
  }

  function endCall() {
    room?.disconnect()
    onCallEnd()
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
      {/* Remote (full-screen) */}
      <div
        ref={remoteRef}
        className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
      />

      {/* Local (picture-in-picture) */}
      <div
        ref={localRef}
        className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden
                   [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
      />

      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900/80">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Connecting to consultation room...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        <Button
          size="icon"
          variant={micOn ? 'secondary' : 'destructive'}
          onClick={toggleMic}
          className="rounded-full w-12 h-12"
          aria-label={micOn ? 'Mute' : 'Unmute'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant={camOn ? 'secondary' : 'destructive'}
          onClick={toggleCam}
          className="rounded-full w-12 h-12"
          aria-label={camOn ? 'Stop camera' : 'Start camera'}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={endCall}
          className="rounded-full w-12 h-12"
          aria-label="End call"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  )
}
