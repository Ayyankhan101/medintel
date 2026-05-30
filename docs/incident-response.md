# Incident Response Playbook

Read top-to-bottom *before* an incident. Print and tape near your desk.

## Severity definitions

| Sev | Description                                                          | Response time |
|-----|----------------------------------------------------------------------|---------------|
| 1   | Platform down OR PHI exposure OR payment double-charge               | < 15 min      |
| 2   | Major feature broken (auth, booking, payment, consult)               | < 1 h         |
| 3   | Minor feature broken (history, reviews, admin reports)               | < 24 h        |
| 4   | Cosmetic, telemetry, non-blocking                                    | next business day |

## 1. Detection

Most incidents surface via:

- Sentry alerts (`@sentry/nextjs` configured server + client)
- Vercel deployment failures
- Stripe / SafePay webhook failure dashboards
- User report (support@medintel.app)
- `/api/health?deep=1` red

## 2. Containment first, root cause second

Order of operations for a Sev 1:

1. **Stop the bleeding** — rollback to last green deploy (Vercel → Promote).
2. **Communicate** — post in #incidents Slack; status page if user-visible.
3. **Preserve evidence** — screenshot, export Sentry event JSON, capture relevant DB rows before any cleanup.
4. **Diagnose** — only now.

## 3. PHI / data-exposure incident

Hard rule: **do not delete data** to "fix" an exposure. Take the leak offline first.

1. Revoke compromised credentials.
2. Disable the affected route via Vercel Edge Config kill-switch (TODO: implement).
3. Snapshot the audit log (`prisma.auditLog`) for the affected window.
4. Notify the data protection lead within 30 minutes.
5. Follow the regulatory notification clock (PMDC, PDPB) — see legal/.

## 4. PSP webhook secret leaked

1. **Stripe**: dashboard → Webhooks → Reveal → Roll. Update `STRIPE_WEBHOOK_SECRET` in Vercel. Redeploy.
2. **SafePay**: dashboard → Settings → API Keys → Regenerate. Update `SAFEPAY_WEBHOOK_SECRET` + `SAFEPAY_API_KEY`. Redeploy.
3. **JazzCash**: contact merchant ops to regenerate integrity salt; update `JAZZCASH_INTEGRITY_SALT`.

Audit `ProcessedStripeEvent` for events received during the leaked window — any unexplained event ID is a red flag.

## 5. Account takeover suspected

1. Force-logout the user: clear their `Session` rows in DB.
2. Reset their password token: `UPDATE "User" SET "passwordResetToken" = NULL`, then trigger forgot-password.
3. Audit recent `audit.log` rows where `actorId = <user>`.
4. If a doctor account: temporarily set `kydStatus = 'PENDING'` to remove from public list.

## 6. Webhook re-drive

Stripe events are idempotent (deduped by `ProcessedStripeEvent`). To replay:

- **Stripe**: Dashboard → Events → click event → Resend
- **SafePay**: Dashboard → Webhooks → click delivery → Retry
- **JazzCash**: out-of-band; contact merchant ops

To force-process a stuck event in dev, delete the `ProcessedStripeEvent` row and resend.

## 7. Post-mortem template

Within 5 business days, file `docs/post-mortems/YYYY-MM-DD-slug.md`:

```
# Incident: <short title>

- Date / time:  ...
- Severity:     ...
- Detected by:  ...
- Duration:     ...

## What happened
## Why it happened
## How we responded
## What went well
## What went badly
## Action items (owner + due date)
```

Action items track in GitHub Issues with label `incident-followup`.

## 8. Do NOT do

- Force-push to `main`.
- `prisma migrate reset` on prod DB.
- Delete audit-log rows.
- Disable Sentry to "make the noise stop".
- Bypass `--no-verify` to push past failing hooks.
