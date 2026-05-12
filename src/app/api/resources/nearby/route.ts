import { NextRequest, NextResponse } from 'next/server'

export interface NearbyPlace {
  placeId:  string
  name:     string
  address:  string
  lat:      number
  lng:      number
  distance: number
  open:     boolean | null
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat     = parseFloat(searchParams.get('lat') ?? '')
  const lng     = parseFloat(searchParams.get('lng') ?? '')
  const keyword = searchParams.get('keyword') ?? 'emergency hospital'
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '3'), 10)

  if (isNaN(lat) || isNaN(lng))
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!apiKey) {
    return NextResponse.json(getMockPlaces(lat, lng, limit), { status: 200 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius',   '15000')
  url.searchParams.set('keyword',  keyword)
  url.searchParams.set('type',     'hospital')
  url.searchParams.set('key',      apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) return NextResponse.json({ error: 'Maps API error' }, { status: 502 })

  const json = await res.json()
  const places: NearbyPlace[] = (json.results ?? [])
    .slice(0, limit)
    .map((p: any) => ({
      placeId:  p.place_id,
      name:     p.name,
      address:  p.vicinity ?? '',
      lat:      p.geometry.location.lat,
      lng:      p.geometry.location.lng,
      distance: haversineKm(lat, lng, p.geometry.location.lat, p.geometry.location.lng),
      open:     p.opening_hours?.open_now ?? null,
    }))
    .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)

  return NextResponse.json(places)
}

function getMockPlaces(lat: number, lng: number, limit: number): NearbyPlace[] {
  const offsets = [
    { name: 'Services Hospital',             dlat: 0.012, dlng: 0.008 },
    { name: 'Mayo Hospital',                 dlat: -0.009, dlng: 0.014 },
    { name: 'Lahore General Hospital',       dlat: 0.022, dlng: -0.011 },
    { name: 'Jinnah Hospital',               dlat: -0.031, dlng: 0.025 },
    { name: 'Sheikh Zayed Hospital',         dlat: 0.040, dlng: -0.030 },
  ]
  return offsets.slice(0, limit).map((o, i) => {
    const pLat = lat + o.dlat
    const pLng = lng + o.dlng
    return {
      placeId:  `mock_${i}`,
      name:     o.name,
      address:  'Lahore, Punjab, Pakistan',
      lat:      pLat,
      lng:      pLng,
      distance: haversineKm(lat, lng, pLat, pLng),
      open:     true,
    }
  }).sort((a, b) => a.distance - b.distance)
}
