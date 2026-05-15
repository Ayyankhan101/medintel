import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'PMDC Disclaimer — MedIntel' }

export default function PMDCPage() {
  return (
    <article>
      <h1>PMDC Disclaimer &amp; Scope of Practice</h1>
      <p><em>Last updated: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>

      <h2>Not a substitute for in-person care</h2>
      <p>Telemedicine consultations on MedIntel are intended for non-emergency conditions, follow-up visits, prescription refills, and second opinions. They <strong>do not replace</strong> physical examination, in-person diagnostic procedures, or hospital admission.</p>

      <h2>Emergencies</h2>
      <p>If you are experiencing chest pain, severe bleeding, signs of stroke, suicidal ideation, or any life-threatening symptom: <strong>call 1122 (Rescue) or go to your nearest emergency department immediately.</strong> Do not use MedIntel for emergencies.</p>

      <h2>Doctor verification</h2>
      <p>Every doctor on MedIntel is verified through:</p>
      <ul>
        <li><strong>Tier 1 — NADRA:</strong> identity verification against the National Database and Registration Authority.</li>
        <li><strong>Tier 2 — PMDC:</strong> active license check against the Pakistan Medical &amp; Dental Council register.</li>
        <li><strong>Tier 3 — Trust badge (optional):</strong> manual review of credentials, hospital affiliations, and patient feedback.</li>
      </ul>
      <p>A KYD-Verified badge means the doctor passed Tiers 1 and 2 at the time of onboarding. Tier 3 doctors carry an additional trust badge.</p>

      <h2>AI triage is advisory only</h2>
      <p>Our AI triage system suggests urgency level and specialty match. It is <strong>not a diagnosis</strong>. Only the doctor handling your consultation can diagnose, prescribe, or refer.</p>

      <h2>Prescriptions</h2>
      <p>Prescriptions are issued by the consulting doctor in accordance with PMDC guidelines and the Drugs Act 1976. Controlled substances (Schedule G, narcotics) are subject to additional verification and may require in-person follow-up.</p>

      <h2>Reporting concerns</h2>
      <p>Concerns about a doctor&apos;s conduct can be reported to:</p>
      <ul>
        <li>MedIntel safety team: <a href="mailto:safety@medintel.app">safety@medintel.app</a></li>
        <li>Pakistan Medical &amp; Dental Council: <a href="https://www.pmdc.pk" target="_blank" rel="noreferrer">pmdc.pk</a></li>
      </ul>

      <h2>Limitations</h2>
      <p>MedIntel is a technology platform. We do not practice medicine and are not liable for clinical decisions. Doctors practice under their own PMDC license and bear professional responsibility for their advice and prescriptions.</p>
    </article>
  )
}
