/**
 * POST /api/clinic/billing/portal
 *
 * Returns a Stripe Customer Portal session URL so the clinic admin can
 * change plan, update card, cancel, or download invoices without us
 * building any of that UI.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const clinic = await prisma.clinic.findUnique({ where: { ownerUserId: session.user.id } })
  if (!clinic?.stripeCustomerId) {
    return NextResponse.json({ error: 'No active billing account yet. Start a subscription first.' }, { status: 409 })
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://medintel.app'
  const portal = await getStripe().billingPortal.sessions.create({
    customer:   clinic.stripeCustomerId,
    return_url: `${appUrl}/clinic/dashboard`,
  })
  return NextResponse.json({ url: portal.url })
}
