import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Refund & Cancellation Policy — MedIntel' }

export default function RefundsPage() {
  return (
    <article>
      <h1>Refund &amp; Cancellation Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>

      <h2>1. How payment works</h2>
      <p>When you book a consultation, your payment is held in escrow by our payment partner (Stripe, SafePay, or JazzCash). The doctor receives funds only after the consultation completes successfully.</p>

      <h2>2. Patient cancellation</h2>
      <ul>
        <li><strong>More than 1 hour before the appointment:</strong> full refund, processed within 5–7 business days.</li>
        <li><strong>Less than 1 hour before the appointment:</strong> 50% refund. The remaining 50% compensates the doctor&apos;s reserved time.</li>
        <li><strong>After the appointment starts:</strong> no refund unless the doctor failed to join or the platform was unable to deliver the consultation.</li>
      </ul>

      <h2>3. Doctor no-show</h2>
      <p>If the doctor fails to join within 30 minutes of the scheduled time, an automatic full refund is issued. You will receive an email confirmation when the refund is processed.</p>

      <h2>4. Technical failure</h2>
      <p>If the video/audio session fails due to a platform issue and cannot be completed, you are entitled to a full refund or a rescheduled consultation at no extra cost. Contact <a href="mailto:support@medintel.app">support@medintel.app</a> within 24 hours.</p>

      <h2>5. Prescription disputes</h2>
      <p>Refunds are not issued because a doctor declined to prescribe a specific medication. Clinical judgment belongs to the doctor; you may book a second opinion at standard rates.</p>

      <h2>6. Partial refunds</h2>
      <p>In rare cases (e.g. consultation cut short for cause), our admin team may issue a partial refund. All partial-refund decisions are audit-logged.</p>

      <h2>7. How refunds reach you</h2>
      <p>Refunds return to the original payment method. Card refunds typically take 5–7 business days. JazzCash / EasyPaisa refunds are usually instant once approved.</p>

      <h2>8. Disputes</h2>
      <p>If you believe a refund decision was incorrect, contact <a href="mailto:disputes@medintel.app">disputes@medintel.app</a> with your appointment ID. We aim to respond within 3 business days.</p>
    </article>
  )
}
