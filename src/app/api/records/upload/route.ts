import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const MAX_BYTES   = 10 * 1024 * 1024  // 10 MB per file
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
])

const ALLOWED_RECORD_TYPES = new Set([
  'PRESCRIPTION', 'LAB_REPORT', 'IMAGING', 'SURGERY', 'ALLERGY', 'CHRONIC_MED', 'OTHER',
])

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: 'records-upload', max: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads — slow down' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // Per-patient namespacing prevents URL guessing across accounts.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const blobKey  = `records/${patient.id}/${Date.now()}-${safeName}`

  let blob: { url: string }
  try {
    blob = await put(blobKey, file, { access: 'public', addRandomSuffix: false })
  } catch (e) {
    console.error('[records/upload] blob put failed', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 502 })
  }

  const record = await prisma.medicalRecord.create({
    data: {
      patientId:  patient.id,
      type,
      title,
      content,
      fileUrl:    blob.url,
      recordedAt: new Date(),
    },
  })

  return NextResponse.json({ record }, { status: 201 })
}
