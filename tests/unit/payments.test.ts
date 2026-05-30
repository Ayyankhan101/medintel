import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { mockProvider }     from '@/lib/payments/mock'
import { safepayProvider }  from '@/lib/payments/safepay'
import { pickProvider, providerFor } from '@/lib/payments'

describe('mockProvider', () => {
  it('emits a redirect to /mock-pay/<ref> on createCheckout', async () => {
    const r = await mockProvider.createCheckout({
      amount:          1500,
      appointmentId:   'appt_1',
      doctorAccountId: 'doc_1',
      successUrl:      'http://x/ok',
      cancelUrl:       'http://x/no',
    })
    expect(r.kind).toBe('redirect')
    expect(r.providerRef.startsWith('mock_')).toBe(true)
    expect(r.redirectUrl!).toMatch(/\/mock-pay\/mock_/)
  })

  it('verifyWebhook normalizes JSON payload', async () => {
    const body = JSON.stringify({
      eventId: 'm_1', type: 'payment.succeeded', providerRef: 'mock_abc',
      appointmentId: 'appt_1', amount: 1500,
    })
    const e = await mockProvider.verifyWebhook(body, new Headers())
    expect(e.eventId).toBe('m_1')
    expect(e.type).toBe('payment.succeeded')
    expect(e.providerRef).toBe('mock_abc')
    expect(e.amount).toBe(1500)
  })

  it('refund + refundCaptured produce unique refs', async () => {
    const a = await mockProvider.refund({ providerRef: 'x', amount: 100 })
    const b = await mockProvider.refundCaptured({ providerRef: 'x', amount: 100 })
    expect(a.refundRef).not.toBe(b.refundRef)
    expect(a.amount).toBe(100)
    expect(b.amount).toBe(100)
  })
})

describe('safepayProvider.verifyWebhook', () => {
  const SECRET = 'unit-test-secret'

  beforeEach(() => {
    process.env.SAFEPAY_WEBHOOK_SECRET = SECRET
  })

  function sign(body: string): string {
    return createHmac('sha256', SECRET).update(body).digest('hex')
  }

  it('accepts a correctly signed payload and normalises type', async () => {
    const body = JSON.stringify({
      id: 'sp_evt_1', type: 'order.completed',
      data: { tracker: 'sp_track_1', amount: 1500, custom_data: { appointmentId: 'appt_1' } },
    })
    const headers = new Headers({ 'x-safepay-signature': sign(body) })
    const e = await safepayProvider.verifyWebhook(body, headers)
    expect(e.eventId).toBe('sp_evt_1')
    expect(e.type).toBe('payment.succeeded')
    expect(e.providerRef).toBe('sp_track_1')
    expect(e.appointmentId).toBe('appt_1')
    expect(e.amount).toBe(1500)
  })

  it('rejects a tampered body', async () => {
    const body = JSON.stringify({ id: 'sp_evt_2', type: 'order.completed' })
    const headers = new Headers({ 'x-safepay-signature': sign(body) + '00'.repeat(0) })
    const tamperedHeaders = new Headers({ 'x-safepay-signature': sign(body + 'x') })
    // Use mismatched signature for the actual body.
    await expect(safepayProvider.verifyWebhook(body, tamperedHeaders))
      .rejects.toThrow(/signature/i)
    // sanity — original headers (correct) would work:
    expect((await safepayProvider.verifyWebhook(body, headers)).type).toBe('payment.succeeded')
  })

  it('rejects a non-hex / wrong-length signature', async () => {
    const body = '{"id":"x"}'
    const headers = new Headers({ 'x-safepay-signature': 'not-a-hex-sig' })
    await expect(safepayProvider.verifyWebhook(body, headers))
      .rejects.toThrow(/signature/i)
  })

  it('marks unknown types as `unknown`', async () => {
    const body = JSON.stringify({ id: 'sp_evt_3', type: 'something.else' })
    const headers = new Headers({ 'x-safepay-signature': sign(body) })
    const e = await safepayProvider.verifyWebhook(body, headers)
    expect(e.type).toBe('unknown')
  })
})

describe('pickProvider / providerFor', () => {
  beforeEach(() => {
    delete process.env.SAFEPAY_API_KEY
    delete process.env.JAZZCASH_MERCHANT_ID
    delete process.env.STRIPE_SECRET_KEY
  })

  it('falls back to mock when no PSP env is configured', () => {
    expect(pickProvider().id).toBe('mock')
  })

  it('prefers SafePay when configured', () => {
    process.env.SAFEPAY_API_KEY = 'k'
    expect(pickProvider().id).toBe('safepay')
  })

  it('uses JazzCash if SafePay is missing but JC is configured', () => {
    process.env.JAZZCASH_MERCHANT_ID = 'mid'
    expect(pickProvider().id).toBe('jazzcash')
  })

  it('explicit preferred wins over env priority', () => {
    process.env.SAFEPAY_API_KEY = 'k'
    expect(pickProvider('mock').id).toBe('mock')
  })

  it('providerFor throws on unknown id', () => {
    expect(() => providerFor('blockchain' as never)).toThrow(/Unknown payment provider/)
  })
})
