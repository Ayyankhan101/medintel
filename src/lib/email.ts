/**
 * Resend email sender — fail-soft.
 *
 * Design:
 *  - If RESEND_API_KEY is missing, log a warning and return false. Never throw.
 *    Email is never on the critical path of a clinical or financial action.
 *  - All templates inline as plain HTML strings (keeps bundle small, no JSX
 *    runtime overhead in a route handler).
 *  - Fire-and-forget from callers — use `void sendXxx(...)`.
 *
 * Env:
 *   RESEND_API_KEY  — pk_ test or live key
 *   RESEND_FROM     — "MedIntel <noreply@medintel.app>" (must be a verified
 *                     sending domain in the Resend dashboard, else use the
 *                     onboarding@resend.dev sandbox sender)
 *   APP_URL         — public base URL for links (falls back to NEXTAUTH_URL)
 */

import { Resend } from 'resend'

let _client: Resend | null = null
function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY)
  return _client
}

const FROM = process.env.RESEND_FROM ?? 'MedIntel <onboarding@resend.dev>'
const APP_URL = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'https://medintel.app'

interface SendArgs {
  to: string
  subject: string
  html: string
}

async function send({ to, subject, html }: SendArgs): Promise<boolean> {
  const c = client()
  if (!c) {
    console.warn('[email] RESEND_API_KEY missing — skipping send to', to)
    return false
  }
  try {
    const { error } = await c.emails.send({ from: FROM, to, subject, html })
    if (error) {
      console.error('[email] resend error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('[email] unexpected error:', e)
    return false
  }
}

// ── shared layout ────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#2563eb;border-radius:8px;text-align:center;color:#fff;font-weight:700;font-size:14px;line-height:32px;">M</td>
                <td style="padding-left:10px;font-weight:700;font-size:16px;color:#0f172a;">MedIntel</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;letter-spacing:-0.015em;color:#0f172a;">${title}</h1>
            ${body}
          </td></tr>
          <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
            MedIntel — voice-first telemedicine for Pakistan.<br/>
            You are receiving this email because of activity on your MedIntel account.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;">${label}</a>`
}

// ── templates ────────────────────────────────────────────────────────────────

export function sendWelcomePatient(args: { to: string; name: string; medIntelCode: string }) {
  return send({
    to: args.to,
    subject: 'Welcome to MedIntel',
    html: layout(
      `Welcome, ${escapeHtml(args.name)}`,
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your MedIntel account is ready. You can describe symptoms by voice in Urdu, Pashto, Punjabi, Sindhi or English, and we'll route you to the right specialist.</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your patient code (share with any doctor to grant access to your records):</p>
       <p style="margin:0 0 22px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:700;color:#2563eb;background:#eff6ff;padding:12px 16px;border-radius:10px;display:inline-block;">${args.medIntelCode}</p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/intake`, 'Start your first consultation')}</p>`,
    ),
  })
}

export function sendWelcomeDoctor(args: { to: string; name: string }) {
  return send({
    to: args.to,
    subject: 'Welcome to MedIntel — your account is under review',
    html: layout(
      `Welcome, Dr. ${escapeHtml(args.name)}`,
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Thanks for joining MedIntel. Your PMDC license is being verified by our team — we'll email you the moment your account goes live for patient bookings.</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">In the meantime you can connect your Stripe account so payouts are ready when you start consulting.</p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/doctor/settings`, 'Set up payouts')}</p>`,
    ),
  })
}

export function sendBookingConfirmation(args: {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  scheduledAt: Date
  appointmentId: string
}) {
  const when = formatPK(args.scheduledAt)
  return send({
    to: args.to,
    subject: `Appointment confirmed — ${when}`,
    html: layout(
      'Your appointment is confirmed',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${escapeHtml(args.patientName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">You're booked with <strong>Dr. ${escapeHtml(args.doctorName)}</strong> (${escapeHtml(args.specialty)}) on <strong>${when}</strong>.</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your consultation fee is held in escrow and will only be released to the doctor after a prescription is issued.</p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/consultation/${args.appointmentId}`, 'Open consultation room')}</p>`,
    ),
  })
}

export function sendDoctorNewBooking(args: {
  to: string
  doctorName: string
  patientCode: string
  scheduledAt: Date
  severityLevel: string
  appointmentId: string
}) {
  const when = formatPK(args.scheduledAt)
  const sev = args.severityLevel.toUpperCase()
  const sevColor = sev === 'CRITICAL' ? '#dc2626' : sev === 'URGENT' ? '#d97706' : '#16a34a'
  return send({
    to: args.to,
    subject: `New booking — ${args.patientCode} (${sev})`,
    html: layout(
      'New patient booking',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi Dr. ${escapeHtml(args.doctorName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Patient <strong>${escapeHtml(args.patientCode)}</strong> has booked you for <strong>${when}</strong>.</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">AI triage severity: <strong style="color:${sevColor};">${sev}</strong></p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/consultation/${args.appointmentId}`, 'Review case')}</p>`,
    ),
  })
}

export function sendPrescriptionReady(args: {
  to: string
  patientName: string
  doctorName: string
  appointmentId: string
}) {
  return send({
    to: args.to,
    subject: 'Your prescription is ready',
    html: layout(
      'Prescription ready',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${escapeHtml(args.patientName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Dr. ${escapeHtml(args.doctorName)} has issued your prescription. You can view or download a PDF copy at any time from your history.</p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/api/appointments/${args.appointmentId}/prescription.pdf`, 'Download PDF')}</p>
       <p style="margin:0;font-size:12px;color:#64748b;">Show this PDF to any pharmacy or hospital in Pakistan.</p>`,
    ),
  })
}

export function sendDoctorVerificationDecision(args: {
  to: string
  doctorName: string
  approved: boolean
  reason?: string
}) {
  if (args.approved) {
    return send({
      to: args.to,
      subject: 'Your MedIntel account is verified',
      html: layout(
        'You are verified',
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi Dr. ${escapeHtml(args.doctorName)},</p>
         <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your PMDC license has been verified and your MedIntel account is now live. Patients can find and book you starting today.</p>
         <p style="margin:0 0 22px;">${button(`${APP_URL}/doctor/dashboard`, 'Open your dashboard')}</p>`,
      ),
    })
  }
  return send({
    to: args.to,
    subject: 'MedIntel account — verification declined',
    html: layout(
      'Verification declined',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi Dr. ${escapeHtml(args.doctorName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">We were unable to verify your credentials. Reason:</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;background:#fef2f2;border-left:3px solid #dc2626;padding:10px 14px;border-radius:6px;">${escapeHtml(args.reason ?? 'Not specified')}</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">If you believe this is in error or you can provide additional documents, reply to this email to appeal.</p>`,
    ),
  })
}

export function sendAppointmentCancelled(args: {
  to: string
  recipientName: string
  counterpartLabel: string
  scheduledAt: Date
  refundIssued: boolean
}) {
  const when = formatPK(args.scheduledAt)
  return send({
    to: args.to,
    subject: `Appointment cancelled — ${when}`,
    html: layout(
      'Appointment cancelled',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${escapeHtml(args.recipientName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your appointment with ${escapeHtml(args.counterpartLabel)} on <strong>${when}</strong> has been cancelled.</p>
       ${args.refundIssued ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your held payment has been refunded. It typically takes 5–10 business days to appear on your statement.</p>` : ''}
       <p style="margin:0 0 22px;">${button(`${APP_URL}/intake`, 'Book a new consultation')}</p>`,
    ),
  })
}

export function sendAppointmentRescheduled(args: {
  to: string
  recipientName: string
  counterpartLabel: string
  oldAt: Date
  newAt: Date
  appointmentId: string
}) {
  return send({
    to: args.to,
    subject: `Appointment rescheduled — now ${formatPK(args.newAt)}`,
    html: layout(
      'Appointment rescheduled',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${escapeHtml(args.recipientName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Your appointment with ${escapeHtml(args.counterpartLabel)} has been moved.</p>
       <p style="margin:0 0 6px;font-size:14px;color:#64748b;text-decoration:line-through;">${formatPK(args.oldAt)}</p>
       <p style="margin:0 0 22px;font-size:16px;font-weight:700;color:#16a34a;">${formatPK(args.newAt)}</p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/consultation/${args.appointmentId}`, 'Open consultation room')}</p>`,
    ),
  })
}

export function sendEscrowReleased(args: {
  to: string
  doctorName: string
  amount: number
  appointmentId: string
}) {
  return send({
    to: args.to,
    subject: `Payment released — PKR ${args.amount.toLocaleString('en-PK')}`,
    html: layout(
      'Payment released',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi Dr. ${escapeHtml(args.doctorName)},</p>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">The escrow for appointment <strong>${args.appointmentId.slice(0, 8)}…</strong> has been released to your connected Stripe account.</p>
       <p style="margin:0 0 22px;font-size:18px;font-weight:700;color:#16a34a;">PKR ${args.amount.toLocaleString('en-PK')}</p>
       <p style="margin:0 0 22px;">${button(`${APP_URL}/doctor/dashboard`, 'View earnings')}</p>`,
    ),
  })
}

export function sendVerifyEmail(args: { to: string; name: string; token: string }) {
  const url = `${APP_URL}/verify-email?token=${encodeURIComponent(args.token)}`
  return send({
    to: args.to,
    subject: 'Verify your MedIntel email',
    html: layout(
      'Confirm your email',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${escapeHtml(args.name)}, tap below to verify your email. The link expires in 24 hours.</p>
       <p style="margin:0 0 22px;">${button(url, 'Verify email')}</p>
       <p style="margin:0;font-size:12px;color:#64748b;">If you didn't sign up for MedIntel, ignore this email.</p>`,
    ),
  })
}

export function sendPasswordReset(args: { to: string; name: string; token: string }) {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(args.token)}`
  return send({
    to: args.to,
    subject: 'Reset your MedIntel password',
    html: layout(
      'Password reset',
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">Hi ${escapeHtml(args.name)}, we received a request to reset your password. The link expires in 1 hour.</p>
       <p style="margin:0 0 22px;">${button(url, 'Reset password')}</p>
       <p style="margin:0;font-size:12px;color:#64748b;">If you didn't request this, ignore this email — your password won't change.</p>`,
    ),
  })
}

// ── utils ────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function formatPK(d: Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(d)
}
