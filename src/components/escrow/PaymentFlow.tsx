'use client'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n/client'

// Lazy — only call loadStripe when the component actually mounts so the
// Stripe SDK (~200KB) is never fetched on pages that don't render PaymentFlow.
let stripePromise: ReturnType<typeof loadStripe> | null = null
function getStripePromise() {
  if (!stripePromise) stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  return stripePromise
}

interface CheckoutFormProps {
  appointmentId: string
  onSuccess: () => void
}

function CheckoutForm({ appointmentId, onSuccess }: CheckoutFormProps) {
  const stripe    = useStripe()
  const elements  = useElements()
  const { T } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/consultation/${appointmentId}`,
      },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {T('payment.escrowHint')}
        </span>
      </div>
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={loading || !stripe} className="w-full">
        {loading ? T('payment.processing') : T('payment.payConfirm')}
      </Button>
    </form>
  )
}

interface Props {
  appointmentId: string
  doctorName: string
  fee: number
  onPaymentComplete: () => void
}

export function PaymentFlow({ appointmentId, doctorName, fee, onPaymentComplete }: Props) {
  const { T } = useI18n()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function initializePayment() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/escrow/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to initialize payment')
      setClientSecret(data.clientSecret)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  if (!clientSecret) {
    return (
      <div className="space-y-4 p-4 border rounded-xl bg-white">
        <div className="text-center space-y-1">
          <p className="font-semibold text-gray-800">{doctorName}</p>
          <p className="text-3xl font-bold text-gray-900">PKR {fee}</p>
          <p className="text-xs text-gray-400">{T('payment.escrowHeld')}</p>
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <Button onClick={initializePayment} disabled={loading} className="w-full">
          {loading ? T('payment.preparing') : T('payment.proceed')}
        </Button>
      </div>
    )
  }

  return (
    <Elements stripe={getStripePromise()} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm appointmentId={appointmentId} onSuccess={onPaymentComplete} />
    </Elements>
  )
}
