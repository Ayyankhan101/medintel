/**
 * GET /api/records/[id]/download
 *
 * Auth-gated proxy for private medical-record blobs. The record's `fileUrl`
 * column holds the blob pathname (not a URL) — only this route can resolve
 * it via @vercel/blob `get()` with our BLOB_READ_WRITE_TOKEN.
 *
 * Ownership is re-checked on every read so a stale URL leaked from the
 * browser is useless to anyone but the patient who owns the record.
 */
import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const record = await prisma.medicalRecord.findUnique({
    where:   { id },
    include: { patient: { select: { userId: true } } },
  })
  if (!record)        return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!record.fileUrl) return NextResponse.json({ error: 'No file attached' }, { status: 404 })

  // Only the owning patient (or an ADMIN) can read. Doctors who need a
  // record should request it through the consultation flow — not via this URL.
  const isOwner = record.patient.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await get(record.fileUrl, { access: 'private' })
  if (!result || !result.stream) return NextResponse.json({ error: 'File missing' }, { status: 404 })

  void audit('record.download', 'MedicalRecord', record.id, {
    actorId:   session.user.id,
    actorRole: session.user.role,
  })

  const headers = new Headers()
  if (result.blob.contentType) headers.set('content-type', result.blob.contentType)
  if (result.blob.size != null) headers.set('content-length', String(result.blob.size))
  headers.set('cache-control', 'private, no-store')
  headers.set('content-disposition', `inline; filename="${record.id}"`)
  return new Response(result.stream as unknown as BodyInit, { status: 200, headers })
}
