import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getPresignedUploadUrl, buildS3Key } from '@/lib/s3'

const ALLOWED_TYPES = [
  'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav',
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
] as const

const schema = z.object({
  filename:    z.string().min(1),
  contentType: z.enum(ALLOWED_TYPES),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const folder = parsed.data.contentType.startsWith('audio/') ? 'voice' : 'docs'
  const key    = buildS3Key(`${folder}/${session.user.id}`, parsed.data.filename)
  const url    = await getPresignedUploadUrl(key, parsed.data.contentType)

  return NextResponse.json({ uploadUrl: url, s3Key: key })
}
