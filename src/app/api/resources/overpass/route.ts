import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  lat:    z.coerce.number().min(-90).max(90),
  lng:    z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(500).max(50000).default(5000),
})

interface OverpassElement {
  id:   number
  type: 'node' | 'way' | 'relation'
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?:   Record<string, string>
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const sa = Math.sin(dLat / 2) ** 2 +
             Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(sa))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({
    lat:    searchParams.get('lat'),
    lng:    searchParams.get('lng'),
    radius: searchParams.get('radius') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { lat, lng, radius } = parsed.data

  // Overpass QL: hospitals + clinics + pharmacies within radius (metres) of (lat,lng).
  const query = `[out:json][timeout:15];
(
  node["amenity"~"hospital|clinic|pharmacy"](around:${radius},${lat},${lng});
  way["amenity"~"hospital|clinic|pharmacy"](around:${radius},${lat},${lng});
);
out center tags 30;`

  let elements: OverpassElement[] = []
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Overpass returns 406 without a real User-Agent identifying the caller.
        'User-Agent': 'MedIntel/1.0 (https://medintel-ten.vercel.app)',
      },
      body:    `data=${encodeURIComponent(query)}`,
      // Overpass has free-tier rate limits; the response cache is also patient-friendly.
      next:    { revalidate: 300 },
    })
    if (!res.ok) {
      console.error('[overpass] non-OK:', res.status, await res.text().catch(() => ''))
      throw new Error(`overpass ${res.status}`)
    }
    const data = await res.json()
    elements = (data.elements ?? []) as OverpassElement[]
  } catch (e) {
    console.error('[overpass] fetch failed:', e)
    return NextResponse.json({ error: 'Could not load nearby places', places: [] }, { status: 502 })
  }

  const places = elements
    .map(el => {
      const eLat = el.lat ?? el.center?.lat
      const eLng = el.lon ?? el.center?.lon
      if (eLat == null || eLng == null) return null
      const amenity = el.tags?.amenity ?? 'place'
      return {
        id:         `osm-${el.type}-${el.id}`,
        name:       el.tags?.name ?? el.tags?.['name:en'] ?? `Unnamed ${amenity}`,
        type:       amenity.toUpperCase(),
        lat:        eLat,
        lng:        eLng,
        distanceKm: Number(haversineKm(lat, lng, eLat, eLng).toFixed(2)),
        phone:      el.tags?.phone ?? el.tags?.['contact:phone'] ?? null,
        address:    el.tags?.['addr:full'] ??
                    ([el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']]
                      .filter(Boolean).join(', ') || null),
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 15)

  return NextResponse.json({ places })
}
