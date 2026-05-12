'use client'
import { useState, useEffect } from 'react'
import { MapPin, Phone, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Resource {
  id:          string
  name:        string
  type:        string
  address:     string
  latitude:    number
  longitude:   number
  phone?:      string | null
  isAvailable: boolean
  distance?:   number
}

const RESOURCE_TYPES = [
  { value: '',                label: 'All Resources'  },
  { value: 'HOSPITAL',       label: 'Hospitals'       },
  { value: 'PHARMACY',       label: 'Pharmacies'      },
  { value: 'OXYGEN',         label: 'Oxygen Cylinders'},
  { value: 'VENTILATOR',     label: 'Ventilators'     },
  { value: 'BLOOD_BANK',     label: 'Blood Banks'     },
  { value: 'AMBULANCE',      label: 'Ambulances'      },
]

export function ResourceFinder() {
  const [type,      setType]      = useState('')
  const [resources, setResources] = useState<Resource[]>([])
  const [loading,   setLoading]   = useState(false)
  const [locError,  setLocError]  = useState('')
  const [coords,    setCoords]    = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => setCoords({ lat: c.latitude, lng: c.longitude }),
      () => setLocError('Location access denied — showing all resources'),
    )
  }, [])

  useEffect(() => {
    fetchResources()
  }, [type, coords]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchResources() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '10' })
    if (type)   params.set('type', type)
    if (coords) { params.set('lat', String(coords.lat)); params.set('lng', String(coords.lng)) }
    const res  = await fetch(`/api/resources?${params}`)
    const data = await res.json()
    setResources(data)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {RESOURCE_TYPES.map(rt => (
          <button
            key={rt.value}
            onClick={() => setType(rt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              type === rt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {rt.label}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={fetchResources} disabled={loading} className="ml-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {locError && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {locError}
        </div>
      )}

      {loading && resources.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Finding resources near you…</p>
        </div>
      )}

      {!loading && resources.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p>No resources found. Try a different filter or expand your area.</p>
        </div>
      )}

      <ul className="space-y-3">
        {resources.map(r => (
          <li key={r.id} className="border rounded-xl p-4 space-y-1 bg-white hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{r.name}</p>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {r.type.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right shrink-0">
                {r.distance !== undefined && (
                  <p className="text-sm font-bold text-gray-700">{r.distance.toFixed(1)} km</p>
                )}
                <span className={`text-xs font-semibold ${r.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                  {r.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{r.address}</span>
            </div>
            <div className="flex gap-3 pt-1">
              {r.phone && (
                <a
                  href={`tel:${r.phone}`}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" /> {r.phone}
                </a>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" /> Get Directions
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
