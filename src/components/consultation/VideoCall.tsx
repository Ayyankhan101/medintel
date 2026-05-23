'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  Room, RemoteParticipant,
  LocalVideoTrack, RemoteVideoTrack,
  LocalAudioTrack, RemoteAudioTrack,
} from 'twilio-video'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, Phone, Wifi, WifiOff } from 'lucide-react'

type NetQuality = '4g' | '3g' | '2g' | 'unknown'

function readNetQuality(): NetQuality {
  const t = navigator.connection?.effectiveType
  if (t === '4g')                     return '4g'
  if (t === '3g')                     return '3g'
  if (t === '2g' || t === 'slow-2g') return '2g'
  return 'unknown'
}

function videoConstraints(q: NetQuality): { width: number; height: number } | false {
  if (q === '2g') return false           // audio-only — every KB counts
  if (q === '3g') return { width: 320, height: 240 }
  return { width: 640, height: 480 }    // 4g / unknown → full quality
}

const NET_LABEL: Record<NetQuality, string> = {
  '4g':     'Good signal',
  '3g':     'Low quality (3G)',
  '2g':     'Audio only (2G)',
  'unknown': '',
}

interface Props {
  token: string
  roomName: string
  onCallEnd: () => void
}

export function VideoCall({ token, roomName, onCallEnd }: Props) {
  const [room,      setRoom]      = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [micOn,     setMicOn]     = useState(true)
  const [camOn,     setCamOn]     = useState(true)
  const [netQuality, setNetQuality] = useState<NetQuality>('unknown')
  const localRef  = useRef<HTMLDivElement>(null)
  const remoteRef = useRef<HTMLDivElement>(null)
  const roomRef   = useRef<Room | null>(null)

  // Disable/enable local video track in response to network changes
  const applyVideoQuality = useCallback((q: NetQuality, r: Room | null) => {
    if (!r) return
    r.localParticipant.videoTracks.forEach(pub => {
      const track = pub.track as LocalVideoTrack | null
      if (!track) return
      if (q === '2g') track.disable()
      else            track.enable()
    })
  }, [])

  useEffect(() => {
    let activeRoom: Room

    async function connect() {
      const q = readNetQuality()
      setNetQuality(q)

      const TwilioVideo = (await import('twilio-video')).default
      activeRoom = await TwilioVideo.connect(token, {
        name:  roomName,
        audio: true,
        video: videoConstraints(q) || false,
        bandwidthProfile: {
          video: {
            mode:              q === '3g' ? 'collaboration' : 'grid',
            maxTracks:         q === '2g' ? 0 : 1,
            renderDimensions:  {
              low:    { width: 176,  height: 144  },
              standard: { width: 320, height: 240 },
              high:   { width: 640,  height: 480  },
            },
          },
        },
        preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],
      })

      roomRef.current = activeRoom
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
  }, [token, roomName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for live network changes during the call
  useEffect(() => {
    const conn = navigator.connection
    if (!conn) return
    function onNetChange() {
      const q = readNetQuality()
      setNetQuality(q)
      applyVideoQuality(q, roomRef.current)
    }
    conn.addEventListener('change', onNetChange)
    return () => conn.removeEventListener('change', onNetChange)
  }, [applyVideoQuality])

  function toggleMic() {
    room?.localParticipant.audioTracks.forEach(pub => {
      micOn ? (pub.track as LocalAudioTrack).disable() : (pub.track as LocalAudioTrack).enable()
    })
    setMicOn(v => !v)
  }

  function toggleCam() {
    room?.localParticipant.videoTracks.forEach(pub => {
      camOn ? (pub.track as LocalVideoTrack).disable() : (pub.track as LocalVideoTrack).enable()
    })
    setCamOn(v => !v)
  }

  function endCall() {
    room?.disconnect()
    onCallEnd()
  }

  const isAudioOnly = netQuality === '2g'

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
      {/* Remote (full-screen) */}
      <div
        ref={remoteRef}
        className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
      />

      {/* Local (picture-in-picture) — hidden in audio-only mode */}
      {!isAudioOnly && (
        <div
          ref={localRef}
          className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden
                     [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
        />
      )}

      {/* Audio-only placeholder */}
      {isAudioOnly && connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
          <WifiOff className="w-10 h-10 text-yellow-400" />
          <p className="text-sm font-medium text-yellow-300">Audio only — weak 2G signal</p>
          <p className="text-xs text-gray-400">Video disabled to save data</p>
        </div>
      )}

      {/* Connecting overlay */}
      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900/80">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Connecting to consultation room...</p>
          </div>
        </div>
      )}

      {/* Network quality badge */}
      {connected && netQuality !== 'unknown' && (
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm
          ${netQuality === '4g' ? 'bg-green-900/70 text-green-300' : netQuality === '3g' ? 'bg-yellow-900/70 text-yellow-300' : 'bg-red-900/70 text-red-300'}`}>
          <Wifi className="w-3 h-3" />
          {NET_LABEL[netQuality]}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        <Button size="icon" variant={micOn ? 'secondary' : 'destructive'}
          onClick={toggleMic} className="rounded-full w-12 h-12"
          aria-label={micOn ? 'Mute' : 'Unmute'}>
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button size="icon" variant={camOn ? 'secondary' : 'destructive'}
          onClick={toggleCam} className="rounded-full w-12 h-12"
          aria-label={camOn ? 'Stop camera' : 'Start camera'}
          disabled={isAudioOnly}
          title={isAudioOnly ? 'Camera disabled on 2G to save data' : undefined}>
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button size="icon" variant="destructive"
          onClick={endCall} className="rounded-full w-12 h-12"
          aria-label="End call">
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  )
}
