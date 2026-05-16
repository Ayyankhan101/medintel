/**
 * POST /api/escrow/checkout
 *
 * Provider-agnostic checkout. The route handler doesn't know whether the
 * patient ends up at Stripe Elements, SafePay's hosted checkout, or our
 * in-app mock. It just:
 *   1. Auth + verify the patient owns the appointment.
 *   2. Verify the doctor is bookable.
 *   3. Pick a provider (SafePay if configured, else mock).
 *   4. Persist an Escrow row in HELD with the provider's reference.
 *   5. Return the checkout instructions for the client.
 *
 * Why a parallel route to /api/escrow/create:
 *   /api/escrow/create remains Stripe-specific so existing card flows don't
 *   regress mid-demo. New PK-local rails go through here; once both flows
 *   are battle-tested we can collapse them into one.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pickProvider } from '@/lib/payments'
import type { ProviderId } from '@/lib/payments'

const schema = z.object({
  appointmentId: z.string().min(1),
  provider:      z.enum(['safepay', 'mock']).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where:   { id: parsed.data.appointmentId },
    include: { patient: { include: { user: true } }, doctor: true, escrow: true },
  })

  if (!appointment)                              return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (appointment.patient.user.id !== session.user.id)
                                                 return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!appointment.doctor)                       return NextResponse.json({ error: 'No doctor assigned' }, { status: 422 })
  if (appointment.escrow)                        return NextResponse.json({ error: 'Payment already started for this appointment' }, { status: 409 })

  const provider = pickProvider(parsed.data.provider as ProviderId | undefined)
  const origin   = req.nextUrl.origin
  const fee      = Number(appointment.doctor.consultationFee)

  // Reserve the escrow row BEFORE calling the PSP. The unique constraint on
  // appointmentId makes this our race guard: two parallel requests cannot both
  // proceed to the PSP, only the winner does. providerRef stays null until the
  // PSP returns its tracker.
  let reserved
  try {
    reserved = await prisma.escrow.create({
      data: {
        appointmentId: appointment.id,
        amount:        fee,
        provider:      provider.id,
      },
    })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Payment already started for this appointment' }, { status: 409 })
    }
    throw e
  }

  let result
  try {
    result = await provider.createCheckout({
      amount:          fee,
      appointmentId:   appointment.id,
      doctorAccountId: appointment.doctor.stripeAccountId ?? appointment.doctor.id,
      successUrl:      `${origin}/booking/${appointment.id}?paid=1`,
      cancelUrl:       `${origin}/booking/${appointment.id}?paid=0`,
      patientEmail:    appointment.patient.user.email ?? undefined,
    })
  } catch (e) {
    // PSP rejected us — release the reservation so the patient can retry.
    await prisma.escrow.delete({ where: { id: reserved.id } }).catch(() => {})
    throw e
  }

  await prisma.escrow.update({
    where: { id: reserved.id },
    data:  {
      providerRef:           result.providerRef,
      // Keep this column for back-compat; not used by non-Stripe providers.
      stripePaymentIntentId: provider.id === 'stripe' ? result.providerRef : null,
    },
  })

  return NextResponse.json({
    provider:     provider.id,
    kind:         result.kind,
    redirectUrl:  result.redirectUrl,
    clientSecret: result.clientSecret,
    amount:       fee,
  })
}
