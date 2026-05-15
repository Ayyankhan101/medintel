import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — MedIntel' }

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>

      <p>MedIntel takes patient data seriously. This Policy explains what we collect, why, and how we protect it under Pakistan&apos;s Personal Data Protection Bill (PECA-adjacent) and PMDC telemedicine guidance.</p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Identity:</strong> name, CNIC reference (for KYD doctor verification only — not stored for patients), phone, email.</li>
        <li><strong>Medical:</strong> symptoms you describe, AI triage output, doctor SOAP notes, prescriptions, uploaded records.</li>
        <li><strong>Session data:</strong> voice/video recordings (with consent), transcripts, appointment metadata.</li>
        <li><strong>Payment:</strong> processed by Stripe; we never see or store full card numbers.</li>
      </ul>

      <h2>2. Why we collect it</h2>
      <ul>
        <li>To deliver the consultation you booked.</li>
        <li>To verify doctor licenses with NADRA and PMDC.</li>
        <li>To generate medical records and prescriptions you can download.</li>
        <li>To detect fraud, abuse, and emergency red-flag content.</li>
      </ul>

      <h2>3. Who sees your data</h2>
      <p>Only the doctor handling your consultation and the patient themselves. Clinic administrators see appointment metadata for billing but never see medical content. MedIntel staff access medical data only when responding to an explicit dispute or safety report you have raised.</p>

      <h2>4. Subprocessors</h2>
      <p>We share data only with vetted subprocessors: Stripe (payments), Twilio (voice/SMS/WhatsApp/video), Groq (AI triage and SOAP synthesis), Resend (transactional email), Vercel (hosting), Neon (database), Sentry (error monitoring). All are bound by data-processing agreements.</p>

      <h2>5. Retention</h2>
      <ul>
        <li>Raw consultation transcripts: <strong>12 months</strong>, then purged automatically.</li>
        <li>SOAP notes, prescriptions, lab results: retained as part of your lifetime medical record unless you request deletion.</li>
        <li>Audit logs: 7 years (regulatory).</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>You can:</p>
      <ul>
        <li>Download your full medical record at any time from <code>/history</code>.</li>
        <li>Request deletion of your account and personal data via <a href="mailto:privacy@medintel.app">privacy@medintel.app</a>. Some records (audit logs, prescriptions tied to controlled substances) may be retained as required by law.</li>
        <li>Object to non-essential processing.</li>
      </ul>

      <h2>7. Security</h2>
      <p>Data is encrypted in transit (TLS 1.3) and at rest. Access is role-scoped and audit-logged. We do not sell, rent, or share data for advertising.</p>

      <h2>8. Children</h2>
      <p>We do not knowingly create accounts for under-18s. Pediatric consultations must be booked by a parent or guardian.</p>

      <h2>9. Contact</h2>
      <p>Privacy officer: <a href="mailto:privacy@medintel.app">privacy@medintel.app</a></p>
    </article>
  )
}
