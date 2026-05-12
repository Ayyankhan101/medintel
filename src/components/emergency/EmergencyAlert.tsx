'use client'
import { useEffect, useState, useCallback } from 'react'
import { getEmergencyInstructions } from '@/lib/emergency'
import type { NearbyPlace } from '@/app/api/resources/nearby/route'
import { Volume2, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  department: string
}

export function EmergencyAlert({ department }: Props) {
  const instruction = getEmergencyInstructions(department)
  const [places,      setPlaces]      = useState<NearbyPlace[]>([])
  const [locError,    setLocError]    = useState('')
  const [speaking,    setSpeaking]    = useState(false)
  const [audioPlayed, setAudioPlayed] = useState(false)

  const speak = useCallback(() => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(instruction.audio)
    utt.lang  = 'en-US'
    utt.rate  = 0.9
    utt.onstart = () => setSpeaking(true)
    utt.onend   = () => { setSpeaking(false); setAudioPlayed(true) }
    window.speechSynthesis.speak(utt)
  }, [instruction.audio])

  useEffect(() => {
    speak()
    if (!navigator.geolocation) { setLocError('Geolocation unavailable'); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        fetch(`/api/resources/nearby?lat=${coords.latitude}&lng=${coords.longitude}&keyword=emergency+hospital&limit=3`)
          .then(r => r.json())
          .then(setPlaces)
          .catch(() => {})
      },
      () => setLocError('Location access denied — showing default hospitals'),
    )
  }, [speak])

  return (
    <div className="bg-red-600 text-white rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="p-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
              Emergency Detected
            </p>
            <h2 className="text-xl font-bold mt-0.5">Immediate Action Required</h2>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={speak}
            disabled={speaking}
            className="shrink-0 text-red-700 bg-white hover:bg-red-50"
          >
            <Volume2 className="w-4 h-4 mr-1" />
            {speaking ? 'Playing…' : audioPlayed ? 'Replay Audio' : 'Play Audio'}
          </Button>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">{instruction.audio}</p>
      </div>

      {/* Steps */}
      <div className="bg-red-700 px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">First-Aid Steps</p>
        <ol className="list-decimal list-inside space-y-1">
          {instruction.steps.map((s, i) => (
            <li key={i} className="text-sm leading-snug">{s}</li>
          ))}
        </ol>
      </div>

      {/* Emergency Call */}
      <div className="bg-red-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Phone className="w-4 h-4" />
          Pakistan Emergency: 1122 / 115
        </div>
        <a
          href="tel:1122"
          className="text-xs bg-white text-red-800 font-bold px-3 py-1 rounded-full hover:bg-red-50"
        >
          Call Now
        </a>
      </div>

      {/* Nearby Hospitals */}
      <div className="bg-red-900 px-4 py-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          <MapPin className="w-3 h-3 inline mr-1" />
          Nearest Emergency Facilities
        </p>
        {locError && <p className="text-xs opacity-70">{locError}</p>}
        {places.length === 0 && !locError && (
          <p className="text-xs opacity-70 animate-pulse">Locating hospitals…</p>
        )}
        <ul className="space-y-2">
          {places.map((p, i) => (
            <li key={p.placeId} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <span className="font-semibold">{i + 1}. {p.name}</span>
                <p className="text-xs opacity-75">{p.address}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold">{p.distance.toFixed(1)} km</span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs underline opacity-80 hover:opacity-100"
                >
                  Directions
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
