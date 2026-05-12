import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'DOCTOR')
    return NextResponse.json({ error: 'Doctors only' }, { status: 403 })

  const doctor = await prisma.doctor.findFirst({
    where:   { user: { id: session.user.id } },
    include: { user: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  let accountId = doctor.stripeAccountId
  if (!accountId) {
    const account = await getStripe().accounts.create({
      type:         'express',
      country:      'PK',
      email:        doctor.user.email,
      capabilities: { transfers: { requested: true } },
    })
    accountId = account.id
    await prisma.doctor.update({ where: { id: doctor.id }, data: { stripeAccountId: accountId } })
  }

  const link = await getStripe().accountLinks.create({
    account:     accountId,
    refresh_url: `${process.env.NEXTAUTH_URL}/doctor/settings?onboard=refresh`,
    return_url:  `${process.env.NEXTAUTH_URL}/doctor/settings?onboard=success`,
    type:        'account_onboarding',
  })

  return NextResponse.json({ url: link.url })
}
