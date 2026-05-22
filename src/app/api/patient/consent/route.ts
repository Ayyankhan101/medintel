import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  researchConsent: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id! } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const updated = await prisma.patient.update({
    where: { id: patient.id },
    data:  { researchConsent: parsed.data.researchConsent },
    select: { id: true, researchConsent: true },
  })

  return NextResponse.json(updated)
}
