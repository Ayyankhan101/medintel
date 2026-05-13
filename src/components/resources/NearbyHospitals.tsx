'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Phone, Loader2, AlertCircle } from 'lucide-react'

// Leaflet touches `window`, so the map is client-only.
const MapView = dynamic(() => import('./NearbyHospitalsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  ),
})

export interface NearbyPlace {
  id:         string
  name:       string
  type:       string
  lat:        number
  lng:        number
  distanceKm: number
  phone:      string | null
  address:    string | null
}

const TYPE_COLORS: Record<string, string> = {
  HOSPITAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  CLINIC:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PHARMACY: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

export function NearbyHospitals() {
  const [coords,  setCoords]  = useState<{ lat: number; lng: number } | null>(null)
  const [places,  setPlaces]  = useState<NearbyPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not available on this device.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        setLoading(false)
        if (err.code === err.PERMISSION_DENIED) setError('Location permission denied. We can\'t show nearby places without it.')
        else setError('Could not get your location.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => {
    if (!coords) return
    fetch(`/api/resources/overpass?lat=${coords.lat}&lng=${coords.lng}&radius=5000`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.places)) setPlaces(data.places)
        else setError(data.error ?? 'Could not load nearby places')
        setLoading(false)
      })
      .catch(() => { setLoading(false); setError('Could not load nearby places') })
  }, [coords])

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Nearby hospitals & pharmacies
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Within 5 km of your current location · data from OpenStreetMap
        </p>
      </div>

      {loading && (
        <div className="px-5 pb-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          {coords ? 'Finding places…' : 'Getting your location…'}
        </div>
      )}

      {error && (
        <div className="mx-5 mb-5 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!loading && !error && coords && places.length > 0 && (
        <>
          <MapView center={coords} places={places} />

          <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {places.map(p => (
              <li key={p.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${TYPE_COLORS[p.type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {p.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                  {p.address && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.address}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{p.distanceKm.toFixed(2)} km</span>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />{p.phone}
                      </a>
                    )}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
                      target="_blank" rel="noreferrer"
                      className="text-slate-500 dark:text-slate-400 hover:underline"
                    >Directions</a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && !error && coords && places.length === 0 && (
        <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">No hospitals or pharmacies found within 5 km.</p>
      )}
    </div>
  )
}
