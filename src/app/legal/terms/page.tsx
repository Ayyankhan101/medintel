import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — MedIntel' }

export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p><em>Last updated: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>

      <p>Welcome to MedIntel. These Terms govern your use of our voice-first telemedicine platform operating in the Islamic Republic of Pakistan.</p>

      <h2>1. Who we are</h2>
      <p>MedIntel is a technology platform that connects patients with PMDC-licensed doctors. We do not practice medicine. Medical advice, diagnosis, and prescriptions are issued by the doctor you book with, not by MedIntel.</p>

      <h2>2. Eligibility</h2>
      <p>You must be 18 or older, or have parent/guardian consent. You must provide accurate registration details. We may suspend accounts that violate these Terms or applicable law.</p>

      <h2>3. Consultations</h2>
      <p>Consultations are scheduled appointments with PMDC-licensed doctors. Doctor identity is verified through NADRA and PMDC. Doctors decide independently whether to issue a prescription. MedIntel does not override clinical judgment.</p>

      <h2>4. Payments &amp; escrow</h2>
      <p>Payments are held in escrow by our payment processor (Stripe) and released to the doctor only after a prescription is issued or the consultation is otherwise completed. Cancellations made more than one hour before the scheduled time are fully refunded automatically. Doctor no-shows trigger automatic refunds within 30 minutes of the scheduled start.</p>

      <h2>5. Recording &amp; medical records</h2>
      <p>Consultations are recorded for medical record-keeping, patient safety, and dispute resolution. You give explicit consent before each session. Raw transcripts are purged after 12 months; structured medical fields (diagnosis, prescription, SOAP notes) are retained as part of your medical history.</p>

      <h2>6. Acceptable use</h2>
      <p>Do not use the platform for emergencies — call 1122 instead. Do not impersonate others, attempt to access another user&apos;s data, or use the service to obtain controlled substances or fraudulent prescriptions.</p>

      <h2>7. Limitations</h2>
      <p>MedIntel provides a communication platform. We are not liable for clinical outcomes, errors, or omissions made by doctors using the platform. Our total liability is limited to the consultation fee paid.</p>

      <h2>8. Termination</h2>
      <p>You may close your account at any time via Account Settings. We may suspend accounts for suspected fraud, misuse, or violations of PMDC code of conduct.</p>

      <h2>9. Governing law</h2>
      <p>These Terms are governed by the laws of Pakistan. Disputes are subject to the exclusive jurisdiction of the courts of Karachi.</p>

      <h2>10. Contact</h2>
      <p>Questions: <a href="mailto:legal@medintel.app">legal@medintel.app</a></p>
    </article>
  )
}
