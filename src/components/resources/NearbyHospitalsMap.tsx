'use client'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NearbyPlace } from './NearbyHospitals'

// Leaflet's default marker icons reference paths that don't exist in our bundle —
// fix the URLs to use the CDN so markers render correctly.
function fixDefaultIcons() {
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string }
  delete proto._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface Props {
  center: { lat: number; lng: number }
  places: NearbyPlace[]
}

export default function NearbyHospitalsMap({ center, places }: Props) {
  useEffect(fixDefaultIcons, [])

  return (
    <div className="h-64 w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        {/* User's own location — small blue dot */}
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={8}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>
        {places.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              <span className="text-xs">{p.type.toLowerCase()} · {p.distanceKm.toFixed(2)} km</span>
              {p.phone && (<><br /><a href={`tel:${p.phone}`}>{p.phone}</a></>)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
