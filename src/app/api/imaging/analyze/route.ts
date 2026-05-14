/**
 * POST /api/imaging/analyze
 *
 * multipart/form-data: image (single file, ≤ 8 MB, image/*)
 *
 * Vision LLM emits structured findings (NEVER a diagnosis). Patient-only.
 * Rate-limited 10/min/IP.
 *
 * Output:
 *   { findings: ImagingFindings, modelUsed, usedFallback }
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { analyzeImage } from '@/lib/imaging'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const MAX     = 8 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(req, { key: 'imaging', max: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many imaging requests' }, { status: 429 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart form' }, { status: 400 })

  const file = form.get('image')
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Missing image' }, { status: 400 })
  if (!ALLOWED.has(file.type))  return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 })
  if (file.size > MAX)          return NextResponse.json({ error: 'Image > 8 MB' }, { status: 413 })

  const buf = Buffer.from(await file.arrayBuffer())
  const b64 = buf.toString('base64')

  const result = await analyzeImage(b64, file.type)
  return NextResponse.json(result)
}
