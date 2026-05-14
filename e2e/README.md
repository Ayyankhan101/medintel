# MedIntel E2E (Playwright)

Smoke tests against a live `next dev` instance on port **3100**. No mocks — real Prisma, real NextAuth.

## Setup (one-time)

```bash
npx playwright install --with-deps chromium
```

Provision a disposable database (or reuse local):

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/medintel_e2e'
npx prisma migrate deploy
npx tsx prisma/seed.ts
npx tsx scripts/seed-demo-accounts.ts
```

## Run

```bash
# headless
npm run e2e

# headed (debug)
npm run e2e -- --headed

# single spec
npm run e2e -- e2e/auth.spec.ts
```

## What's covered

- **auth.spec.ts** — login rejects bad creds, forgot-password silently confirms, patient/doctor land on the right home page.
- **booking.spec.ts** — patient can open a doctor profile from the list; unknown id renders the not-found state.

## Adding tests

- Reuse the seeded demo accounts (`patient@demo.medintel.app` / `Demo1234`, same for doctor) — they're grandfathered past email verification.
- Keep the suite serial (`workers: 1` in `playwright.config.ts`) — we share one dev server and one DB.
- Don't hit Stripe / Twilio / Groq from CI. Stub at the route boundary if you need to.
