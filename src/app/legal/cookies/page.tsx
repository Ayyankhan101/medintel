'use client'

import { useI18n } from '@/lib/i18n/client'

export default function CookiesPage() {
  const { T } = useI18n()
  return (
    <article>
      <h1>{T('legal.consent')}</h1>
      <p><em>Last updated: {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</em></p>

      <h2>1. What we use cookies for</h2>
      <p>MedIntel uses a small number of cookies — only the ones needed to keep you signed in, deliver consultations safely, and keep the platform secure. We do not use advertising or third-party tracking cookies.</p>

      <h2>2. Cookies we set</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Purpose</th><th>Type</th><th>Lifetime</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>authjs.session-token</code> (or <code>__Secure-authjs.session-token</code>)</td>
            <td>Keeps you signed in across pages</td>
            <td>Strictly necessary</td>
            <td>Session</td>
          </tr>
          <tr>
            <td><code>authjs.csrf-token</code> (or <code>__Host-authjs.csrf-token</code>)</td>
            <td>Prevents cross-site request forgery on sign-in / sign-out</td>
            <td>Strictly necessary</td>
            <td>Session</td>
          </tr>
          <tr>
            <td><code>authjs.callback-url</code></td>
            <td>Remembers where to send you after sign-in</td>
            <td>Strictly necessary</td>
            <td>Session</td>
          </tr>
          <tr>
            <td><code>medintel-locale</code></td>
            <td>Remembers your language choice (Urdu / English)</td>
            <td>Preference</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Analytics</h2>
      <p>We use Vercel Analytics in privacy-friendly mode. It does not set persistent cookies and does not track you across sites.</p>

      <h2>4. Error tracking</h2>
      <p>When an error occurs, we may send a sanitized report to Sentry. These reports do not contain medical information and are not used to identify you.</p>

      <h2>5. Managing cookies</h2>
      <p>You can clear cookies via your browser settings. Note that clearing strictly-necessary cookies will sign you out and may break some features.</p>

      <h2>6. Changes</h2>
      <p>If we change which cookies we use, we will update this page and the &quot;Last updated&quot; date above.</p>
    </article>
  )
}
