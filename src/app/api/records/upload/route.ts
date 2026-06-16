import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimitDb } from '@/lib/rate-limit'
import { captureError } from '@/lib/observability'

const MAX_BYTES   = 10 * 1024 * 1024  // 10 MB per file
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
])

const ALLOWED_RECORD_TYPES = new Set([
  'PRESCRIPTION', 'LAB_REPORT', 'IMAGING', 'SURGERY', 'ALLERGY', 'CHRONIC_MED', 'OTHER',
])

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // DB-backed limiter so the cap applies globally across Fluid Compute
  // instances — uploads cost storage + bandwidth, attacker can't multiply by
  // region.
  const rl = await rateLimitDb('records-upload', session.user.id!, { max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads — slow down' }, { status: 429 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'File storage not configured — set BLOB_READ_WRITE_TOKEN' }, { status: 503 })
  }

  let form: FormData
  try { form = await req.formData() }
  catch { return NextResponse.json({ error: 'Invalid form-data body' }, { status: 400 }) }

  const file  = form.get('file')
  const type  = String(form.get('type') ?? 'OTHER').toUpperCase()
  const title = String(form.get('title') ?? '').slice(0, 200)
  const content = String(form.get('content') ?? '').slice(0, 4000)

  if (!(file instanceof File))                 return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  if (file.size > MAX_BYTES)                   return NextResponse.json({ error: `File larger than ${MAX_BYTES / 1024 / 1024} MB` }, { status: 413 })
  if (file.size === 0)                         return NextResponse.json({ error: 'Empty file' }, { status: 400 })
  if (!ALLOWED_MIME.has(file.type))            return NextResponse.json({ error: 'Only JPG, PNG, WEBP or PDF accepted' }, { status: 415 })
  if (!ALLOWED_RECORD_TYPES.has(type))         return NextResponse.json({ error: 'Invalid record type' }, { status: 400 })
  if (title.length < 2)                        return NextResponse.json({ error: 'Title required' }, { status: 400 })

  // Private blob — never reachable by unauthenticated GET. The pathname is
  // stored in MedicalRecord.fileUrl and only served via the authenticated
  // /api/records/[id]/download route, which re-checks ownership on every read.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const blobKey  = `records/${patient.id}/${Date.now()}-${safeName}`

  let blob: { pathname: string }
  try {
    blob = await put(blobKey, file, { access: 'private', addRandomSuffix: true })
  } catch (e) {
    console.error('[records/upload] blob put failed', e)
    captureError(e, { context: 'records/upload blob put' })
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }

  const record = await prisma.medicalRecord.create({
    data: {
      patientId:  patient.id,
      type,
      title,
      content,
      // Store the pathname (not a URL) — private blobs aren't addressable by
      // URL. The download route resolves it back via @vercel/blob `get()`.
      fileUrl:    blob.pathname,
      recordedAt: new Date(),
    },
  })

  return NextResponse.json({ record }, { status: 201 })
}
