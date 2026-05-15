import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  const lat    = parseFloat(searchParams.get('lat') ?? '')
  const lng    = parseFloat(searchParams.get('lng') ?? '')
  const type   = searchParams.get('type') ?? ''
  const radius = parseFloat(searchParams.get('radius') ?? '20')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50)

  const where: Record<string, unknown> = { isAvailable: true }
  if (type) where.type = type

  const resources = await prisma.medicalResource.findMany({ where, take: 200 })

  let filtered: Array<typeof resources[number] & { distance?: number }> = resources
  if (!isNaN(lat) && !isNaN(lng)) {
    filtered = resources
      .map(r => ({ ...r, distance: haversineKm(lat, lng, Number(r.latitude), Number(r.longitude)) }))
      .filter(r => r.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
  }

  return NextResponse.json(filtered)
}
