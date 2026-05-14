/**
 * POST /api/clinic/billing/checkout
 *
 * Body: { plan: 'STARTER' | 'STANDARD' }   (ENTERPRISE is sales-only)
 *
 * Creates (or reuses) the Stripe Customer for the caller's clinic and
 * returns a Checkout Session URL for the chosen plan's Subscription Price.
 *
 * The clinic's plan / minutesQuota / period end aren't changed here —
 * those flip only when Stripe sends checkout.session.completed +
 * invoice.paid to /api/stripe/webhook. This keeps the source of truth
 * on Stripe's side and avoids "paid in UI, never charged" drift.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { PLAN_PRICE_ID } from '@/lib/clinic'

export const dynamic = 'force-dynamic'

const schema = z.object({ plan: z.enum(['STARTER', 'STANDARD']) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLINIC_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const priceId = PLAN_PRICE_ID[parsed.data.plan]
  if (!priceId) return NextResponse.json({ error: 'Plan not configured. Contact sales.' }, { status: 409 })

  const clinic = await prisma.clinic.findUnique({
    where:   { ownerUserId: session.user.id },
    include: { owner: { select: { email: true, name: true } } },
  })
  if (!clinic) return NextResponse.json({ error: 'No clinic linked' }, { status: 404 })

  const stripe = getStripe()

  // 1. Ensure a Stripe customer exists for this clinic.
  let customerId = clinic.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    clinic.owner.email,
      name:     clinic.name,
      metadata: { clinicId: clinic.id, ownerUserId: session.user.id },
    })
    customerId = customer.id
    await prisma.clinic.update({ where: { id: clinic.id }, data: { stripeCustomerId: customerId } })
  }

  // 2. Checkout Session for a subscription on the chosen Price.
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://medintel.app'
  const checkout = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    customer:             customerId,
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          `${appUrl}/clinic/dashboard?billing=success`,
    cancel_url:           `${appUrl}/clinic/dashboard?billing=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { clinicId: clinic.id, plan: parsed.data.plan },
    },
    metadata: { clinicId: clinic.id, plan: parsed.data.plan },
  })

  return NextResponse.json({ url: checkout.url })
}
