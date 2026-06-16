# MedIntel — Operations Runbook

How to keep MedIntel running. Read this before going on-call.

## 1. Surfaces

| Layer            | Where                                    |
|------------------|------------------------------------------|
| App              | Vercel project `medical-app` (Fluid Compute) |
| Database         | Neon PostgreSQL (Vercel Marketplace)     |
| File storage     | Vercel Blob (records, prescriptions)     |
| OCR / vision     | AWS S3 + Textract                        |
| Voice STT        | OpenAI Whisper (Groq primary)            |
| LLM triage       | Groq → OpenAI fallback                   |
| Video            | LiveKit Cloud                            |
| SMS              | Twilio SMS                               |
| Email            | Resend                                   |
| Payments         | Stripe Connect + SafePay + JazzCash      |
| Error tracking   | Sentry                                   |
| Bot mitigation   | Vercel BotID                             |

## 2. Daily checks

```bash
curl https://medintel.app/api/health?deep=1 | jq
```

- `ok: true` — required deps green
- `integrations.*: 'configured'` — optional deps configured
- Any `missing` is acceptable in staging; flag in prod

## 3. Cron jobs

Defined in `vercel.json`. All gated by `CRON_SECRET`.

| Path                                    | Schedule       | Purpose                                |
|-----------------------------------------|----------------|----------------------------------------|
| `/api/cron/appointment-reminders`       | `0 7 * * *`    | Daily — reminders for next 27h         |
| `/api/cron/no-show-refund`              | `0 13 * * *`   | Daily — refund stuck no-shows          |
| `/api/cron/maintenance`                 | manual         | Trigger via curl; not scheduled        |
| `/api/cron/research-insights`           | manual         | Trigger via curl; not scheduled        |

**Hobby plan cap**: Vercel Hobby limits crons to **daily granularity** and **2 entries**. Maintenance + research routes still exist; invoke them by hand or from GitHub Actions cron. On Pro/Team, switch reminders/no-show back to `*/10 * * * *` and `*/15 * * * *` for near-real-time behavior (see comments in each handler).

Manual trigger (for testing):

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://medintel.app/api/cron/appointment-reminders
```

## 4. Common incidents

### 4.1 Payments stuck in HELD

Likely Stripe → app webhook failed.

1. Check Sentry for `[stripe-webhook]` errors.
2. Inspect `ProcessedStripeEvent` for the missing event ID.
3. Re-drive from Stripe Dashboard → Developers → Webhooks → Resend.

### 4.2 Doctor no-show refund didn't fire

1. Confirm cron ran: Vercel project → Cron Jobs → run history.
2. Manually trigger the cron (Section 3) and watch the response.
3. If `refunded: 0` and `considered: 0`, the appointment grace (30 min) has not elapsed.

### 4.3 Voice transcription failing

1. `/api/health?deep=1` — confirm `ai: configured`.
2. Check Groq + OpenAI status pages.
3. Tail logs for `[transcribe] AI pipeline error`.
4. If both providers are down, the route returns 502 — patients can still use `/intake` text mode.

### 4.4 LiveKit video room won't connect

1. Confirm `recordingConsentAt` is set on the appointment.
2. Confirm patient escrow `status === 'HELD'` (token route requires it).
3. Confirm `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` are set.
4. Re-mint the token via `POST /api/consultation/token`.

## 5. Secret rotation

Order matters — break-glass instructions:

1. **`NEXTAUTH_SECRET`**: rotate during a low-traffic window. All active sessions are invalidated.
2. **`STRIPE_WEBHOOK_SECRET`**: update in Vercel → push → update endpoint in Stripe Dashboard. Old secret accepted for the brief window between deploy + dashboard update.
3. **`CRON_SECRET`**: rotate freely; idempotent.
4. **`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`**: rotate via LiveKit Cloud console first, then update Vercel env, then redeploy.
5. **`TWILIO_AUTH_TOKEN`**: rotate via Twilio console first, then update Vercel env, then redeploy.
5. **`SAFEPAY_WEBHOOK_SECRET` / `JAZZCASH_INTEGRITY_SALT`**: see `docs/incident-response.md` §4.

Never check secrets into Git. `.env*` is gitignored; verify with `git ls-files | grep .env`.

## 6. Releasing

```bash
git push origin main   # triggers Vercel preview + auto-promote pipeline
```

For risky changes, use Vercel Rolling Releases (gradual % rollout).

## 7. Rollback

Vercel project → Deployments → click previous green deploy → **Promote to Production**.

DB schema rollbacks: never use `prisma migrate reset` on prod. Generate a *down* migration manually and apply via `npx prisma migrate deploy`.

## 8. On-call contacts

(Fill in for your team.)

- Primary: ___________
- Secondary: ___________
- Vercel support: dashboard chat
- Stripe support: dashboard chat
- Twilio support: console support tab
