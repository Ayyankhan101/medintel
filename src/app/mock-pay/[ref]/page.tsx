/**
 * Demo-only fake checkout page.
 *
 * Linked to from the mock payment provider's `redirectUrl`. Lets the
 * presenter complete or cancel a payment without wiring up a real PSP — the
 * "Pay" button POSTs to /api/payments/mock/complete which dispatches a
 * payment.succeeded event into the same handler path SafePay would use.
 *
 * Visible at /mock-pay/<ref>?amount=...&appointmentId=...&successUrl=...&cancelUrl=...
 */
'use client'
import { useSearchParams, useParams } from 'next/navigation'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n/client'

export default function MockPayPage() {
  const params = useParams<{ ref: string }>()
  const sp     = useSearchParams()
  const { T }  = useI18n()
  const [busy, setBusy] = useState<'pay' | 'cancel' | null>(null)

  const amount        = sp.get('amount') ?? '0'
  const appointmentId = sp.get('appointmentId') ?? ''
  const successUrl    = sp.get('successUrl') ?? '/'
  const cancelUrl     = sp.get('cancelUrl') ?? '/'

  async function pay() {
    setBusy('pay')
    await fetch('/api/payments/mock/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        providerRef:   params.ref,
        appointmentId,
        amount:        Number(amount),
        type:          'payment.succeeded',
      }),
    })
    window.location.assign(successUrl)
  }

  function cancel() {
    setBusy('cancel')
    window.location.assign(cancelUrl)
  }

  return (
    <main style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui',
    }}>
      <div style={{
        background: '#fff', color: '#0f172a', padding: 32, borderRadius: 16,
        width: 'min(420px, 92vw)', boxShadow: '0 30px 60px rgba(0,0,0,.4)',
      }}>
        <div style={{ fontSize: 12, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {T('mockPay.title')}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 18px' }}>{T('mockPay.confirm')}</h1>

        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 14, margin: 0 }}>
          <dt style={{ color: '#64748b' }}>{T('mockPay.amount')}</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>Rs. {Number(amount).toLocaleString('en-PK')}</dd>
          <dt style={{ color: '#64748b' }}>{T('mockPay.booking')}</dt>
          <dd style={{ margin: 0, fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>{appointmentId}</dd>
          <dt style={{ color: '#64748b' }}>{T('mockPay.method')}</dt>
          <dd style={{ margin: 0 }}>{T('mockPay.methodValue')}</dd>
        </dl>

        <p style={{ fontSize: 12, color: '#64748b', margin: '18px 0 22px' }}>
          {T('mockPay.disclaimer')}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={pay} disabled={busy !== null}
                  style={{
                    flex: 1, padding: '12px 14px', border: 0, borderRadius: 12,
                    background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}>
            {busy === 'pay' ? T('mockPay.paying') : T('mockPay.pay').replace('{amount}', amount)}
          </button>
          <button onClick={cancel} disabled={busy !== null}
                  style={{
                    padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 12,
                    background: '#fff', color: '#0f172a', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}>
            {T('mockPay.cancel')}
          </button>
        </div>
      </div>
    </main>
  )
}
