# MedIntel

> Voice-first telemedicine for Pakistan. Identity-verified patients describe their symptoms in Urdu, Pashto, Punjabi, Sindhi or English, get AI-triaged in seconds by a Zod-validated clinical agent, are matched to a credential-verified specialist, and consult over video — with consultation fees held in escrow until a signed PDF prescription is delivered.

[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/new)

---

## What it does

MedIntel is a full-stack healthcare MVP designed for low-trust, low-bandwidth markets. The core loop is:

1. **Patient registers** with their CNIC — identity is verified against NADRA (mocked in demo, fail-closed in production).
2. **Patient describes symptoms** by voice (Urdu / Pashto / Punjabi / Sindhi / English, transcribed by Whisper-Large-v3) or by typing.
3. **Triage agent** — a Zod-validated clinical AI agent (Llama 3.3 70B via Groq) returns chief complaint, symptoms, red flags, severity 1–10, and a specialty whitelisted against a 17-item canonical registry. JSON-mode response, one fix-up retry on schema failure, deterministic keyword fallback if the LLM is unavailable.
4. **Document refinement (optional)** — patient uploads lab reports / imaging / ECGs / prescription photos; Groq Llama-4-Scout vision extracts clinical metrics (HbA1c, stenosis %, BP, etc.), flags abnormal values, and updates severity + specialty.
5. **Nearby hospitals** — Leaflet map (CARTO Voyager tiles) shows hospitals, clinics and pharmacies from OpenStreetMap via Overpass, with progressive radius (5 → 15 → 30 → 50 km).
6. **Doctor matching** surfaces only PMDC-licensed, KYD-verified specialists. CRITICAL cases get an emergency-room advisory banner.
7. **Booking + escrow** — fee captured into Stripe escrow (manual-capture PaymentIntent, PKR currency) at confirmation.
8. **Video consultation** runs over Twilio Programmable Video. Doctor sees a sticky sidebar with the patient's allergies, chronic meds, surgeries, and past prescriptions.
9. **Prescription** by the doctor — releases escrow atomically and generates a downloadable bilingual PDF stored in the patient's vault.

All triage data (transcript, summary, severity, specialty) is stored server-side keyed to the patient's ID — the client only ever carries a `triageId`, so a CRITICAL severity score cannot be forged to jump the queue.

---

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  Next.js 16 App     │    │  PostgreSQL (Neon)   │    │  External services  │
│  Router (App dir)   │◄───┤  via Prisma 5        │    │                     │
│  React 19 + TW v4   │    │                      │    │  • Groq (AI + STT)  │
│                     │    │  • User / Patient    │    │  • Stripe (escrow)  │
│  /api routes run    │    │  • Doctor / Triage   │    │  • Twilio Video     │
│  on Fluid Compute   │    │  • Appointment       │    │  • Overpass / OSM   │
│                     │    │  • Escrow / Records  │    │  • NADRA / PMDC     │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
        │
        │ middleware.ts — role-based route protection
        ▼
   PATIENT  → /intake → /doctors → /book → /consultation → /history
   DOCTOR   → /doctor/dashboard → /consultation → /doctor/patients
   ADMIN    → /admin
```

**Stack**

- **Frontend:** Next.js 16 App Router, React 19, Tailwind CSS v4, Lucide, Leaflet + react-leaflet
- **Backend:** Next.js Route Handlers (Node.js runtime on Fluid Compute)
- **Auth:** NextAuth v5 beta (JWT strategy, Credentials provider) + role-based middleware
- **Database:** PostgreSQL via Prisma 5 (Neon serverless in prod)
- **AI:**
  - Chat / triage agent: Groq `llama-3.3-70b-versatile` (JSON mode)
  - Speech-to-text: Groq `whisper-large-v3` (5 languages)
  - Document vision: Groq `meta-llama/llama-4-scout-17b-16e-instruct`
  - Output validated with Zod; specialty whitelisted against canonical registry
- **Payments:** Stripe Connect, manual-capture PaymentIntents, **PKR (zero-decimal)**
- **Video:** Twilio Programmable Video
- **PDF:** `@react-pdf/renderer` (server-side prescription generation)
- **Maps:** Leaflet + CARTO Voyager tiles; Overpass API for live hospital data
- **Voice:** Browser MediaRecorder (audio/webm on Android, audio/mp4 on iOS) → direct to Groq Whisper (no S3 dependency)

---

## The triage agent

Lives at `src/lib/triage/` — a single well-defined agent with strict output contracts.

```
src/lib/triage/
├── specialties.ts   Canonical registry of 17 specialties
│                    (name, LLM description, fallback keywords)
└── agent.ts         The triage agent itself
                     • System prompt (persona, safety rules, severity scale)
                     • User prompt (patient input only)
                     • response_format: { type: 'json_object' }
                     • Zod schema validation
                     • One fix-up retry on schema failure
                     • Deterministic keyword fallback
                     • Source tracked: 'llm' | 'llm-retry' | 'fallback'
```

**TriageOutput schema** (Zod-enforced):

```ts
{
  chiefComplaint:     string,    // 2–200 chars
  symptoms:           string[],
  duration:           string,    // e.g. "2 days", "unknown"
  redFlags:           string[],
  medicalTermSummary: string,    // 10–800 chars
  severityScore:      number,    // int 1–10
  severityLevel:      'ROUTINE' | 'URGENT' | 'CRITICAL',
  specialty:          string,    // whitelisted against 17-item registry
  confidence:         number,    // 0–1
  reasoning:          string,    // ≤ 400 chars
}
```

**Canonical specialties:** General Medicine, Cardiology, Neurology, Pulmonology, Gastroenterology, Orthopedics, Dermatology, Psychiatry, Pediatrics, Gynecology, ENT, Urology, Ophthalmology, Endocrinology, Nephrology, Oncology, Emergency Medicine.

The same registry is consumed by the doctor signup form, the refine route, and the keyword-fallback path — there is no other specialty list anywhere in the codebase.

---

## Project structure

```
src/
├── middleware.ts                 Role-based route protection
├── app/
│   ├── api/                      Route handlers
│   │   ├── appointments/         Create, list, fetch, PATCH (locked once escrow held)
│   │   │   └── [id]/prescription.pdf/  Bilingual PDF — patient + doctor + admin
│   │   ├── auth/                 NextAuth + register (discriminated union: PATIENT / DOCTOR)
│   │   ├── consultation/token/   Twilio access token issuance
│   │   ├── doctors/              Search + fetch by id
│   │   ├── doctor/               Queue + earnings stats (doctor-only)
│   │   ├── escrow/               Create / release / refund (server-authoritative)
│   │   ├── kyc/                  NADRA verification (fail-closed in prod)
│   │   ├── kyd/                  PMDC license verification
│   │   ├── prescriptions/        Doctor upload → auto-releases escrow
│   │   ├── records/              Medical vault
│   │   ├── resources/overpass/   Live OSM hospital/clinic/pharmacy lookup
│   │   ├── stripe/               Onboarding + webhook
│   │   ├── triage/[id]/refine/   Vision-based document analysis
│   │   └── voice/                transcribe (audio) + transcribe-text
│   ├── (app)/
│   │   ├── (patient)/            Intake → Doctors → Book → History
│   │   └── (doctor)/             Dashboard, Patients, Settings
│   ├── consultation/[id]/        Shared video-call page (sidebar for doctor view)
│   └── (auth)/                   Login + Register (patient) + Register (doctor)
├── components/
│   ├── intake/                   SymptomSummary, UploadDocs, clinical-findings table
│   ├── voice/                    VoiceRecorder (5-language, live waveform, REC badge)
│   └── resources/                NearbyHospitals(Dialog|Map) — Leaflet + Overpass
├── lib/
│   ├── triage/                   Triage agent + canonical specialty registry
│   ├── pdf/                      @react-pdf/renderer prescription template
│   └── auth, prisma, openai,     stripe, twilio, kyc, kyd
└── types/                        Shared TS types + NextAuth augmentation
prisma/
├── schema.prisma                 PostgreSQL — production schema (Triage table, enums)
├── schema.sqlite.prisma          SQLite — kept for offline/local hacking
└── seed.ts                       Medical resources (Lahore hospitals)
scripts/
└── seed-demo-accounts.ts         Demo patient + doctor + records + appointments
```

---

## Deploying to Vercel

### Prerequisites

- A Vercel account
- A GitHub account with this repo imported
- A Groq API key (free at <https://console.groq.com>)

### One-time setup

#### 1. Provision Postgres

In your Vercel project dashboard:

1. **Storage** → **Create Database** → **Neon** (or any Postgres provider in the Marketplace)
2. Accept the integration — Vercel sets `DATABASE_URL` on the project automatically

#### 2. Set required environment variables

In **Settings → Environment Variables**, set these for *Production* (and *Preview* if you want PR previews to work):

| Variable | Value |
|----------|-------|
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (match the actual deployment URL exactly) |
| `AUTH_TRUST_HOST` | `true` |
| `GROQ_API_KEY` | From <https://console.groq.com> |
| `MOCK_KYC` | `true` (only for demo — see "Going to real production") |

`DATABASE_URL` is already set by the Neon integration.

> ⚠ `NEXTAUTH_URL` must match the host the user actually visits. A mismatch (e.g. setting `https://medintel.vercel.app` when the URL is `https://medintel-ten.vercel.app`) scopes the session cookie to the wrong domain and breaks login.

#### 3. Deploy

Push to your connected branch. Vercel's `vercel-build` script runs:

```
prisma generate && prisma db push --accept-data-loss --skip-generate && next build
```

The schema is pushed directly (no migration files needed). For real production where you want versioned migrations, switch back to `prisma migrate deploy` and check in `prisma/migrations/`.

#### 4. Seed demo accounts (optional)

After the first deploy:

```bash
vercel env pull .env.local
DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d= -f2- | tr -d '"') \
  npx tsx scripts/seed-demo-accounts.ts
```

Creates:
- `patient@demo.medintel.app` / `Demo1234` — KYC-verified, has Penicillin allergy and Amlodipine on file, 3 past appointments (one with prescription + escrow released)
- `doctor@demo.medintel.app` / `Demo1234` — VERIFIED, trust-badged, Cardiology, `stripeAccountId=acct_demo_placeholder`

---

## Local development

```bash
git clone https://github.com/<you>/medintel.git
cd medintel
npm install
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, GROQ_API_KEY

# Spin up a local Postgres (or point at any Postgres URL)
docker run --rm -d --name medintel-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=medintel postgres:16

# Push schema + seed
npx prisma db push
npx tsx prisma/seed.ts
npx tsx scripts/seed-demo-accounts.ts

# Start the dev server
npm run dev
```

Open <http://localhost:3000>.

---

## Running with Docker (no Vercel)

The repo includes a multi-stage `Dockerfile`, `docker-entrypoint.sh`, and `docker-compose.yml` that bundle the app with a persistent SQLite volume (uses `schema.sqlite.prisma`).

```bash
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export GROQ_API_KEY=your_groq_key
docker compose up --build
```

App is at <http://localhost:3000>; SQLite data persists in the `medintel_data` Docker volume.

> The Docker path is the easiest way to demo the app on a single machine. For multi-user or production hosting, use the Vercel + Neon path above.

---

## Security model

This app makes specific architectural choices to keep clinical and financial data trustworthy:

- **Triage is server-authoritative.** Voice and text intake routes write the AI's severity score, transcript, and summary to a `Triage` table scoped to the patient's ID. The client only carries a `triageId` forward — it cannot forge a CRITICAL score to jump the queue.
- **AI is a helper, never a decision-maker.** The triage agent never diagnoses ("likely", "suggestive of", "compatible with"). Specialty output is whitelisted against the canonical 17-item registry — the LLM cannot invent a routing target. Final clinical decisions are the doctor's.
- **Role-based middleware.** `src/middleware.ts` enforces that doctors can't hit patient routes and vice-versa. Unauthenticated requests get a 307 to `/login?callbackUrl=…`.
- **Escrow is locked once held.** `PATCH /api/appointments/[id]` (doctor reassignment) rejects with 409 if an escrow row exists or the appointment isn't still `SCHEDULED`. New doctors must also be `VERIFIED` and have a `stripeAccountId`.
- **KYC fails closed.** Missing `NADRA_API_URL` in production refuses to mark a user verified. Mock mode is gated behind `NODE_ENV !== 'production'` or an explicit `MOCK_KYC=true`.
- **Prescription release is atomic with payment.** Doctor uploads a prescription → escrow auto-releases via the same route. The release path verifies `appointment.doctor.stripeAccountId` and `appointment.escrow.amount` server-side; neither is client-controllable.
- **Triage refine is ownership-checked.** `/api/triage/[id]/refine` rejects if `triage.patient.user.id !== session.user.id` (no IDOR).
- **Prisma errors are never reflected to the client.** All `try/catch` blocks return generic messages; full errors go to `console.error` for ops triage.

---

## Known limitations (MVP scope)

- **KYD Tier 3 verification is a stub.** `trustBadge` is set manually or via direct DB update.
- **No reschedule / cancel UI.** Cancellation is only possible via the auto-refund grace window (2 hours after `scheduledAt`).
- **Notifications are not implemented.** No email/SMS for booking, prescription-ready, etc.
- **Doctor availability is binary.** No working-hours / on-call toggle.
- **PDF prescription is English-only.** Patient name and basic fields are bilingual-capable but the template is currently single-language.

---

## Going to real production

If you're moving past the demo:

1. **Remove `MOCK_KYC=true`** and wire up real NADRA + PMDC credentials.
2. **Switch from `prisma db push` to `prisma migrate deploy`** with versioned migrations checked into git.
3. **Verify Stripe Connect** is in live mode and the platform account has the right capabilities for PKR payouts.
4. **Tighten rate limiting** on `/api/auth/register`, `/api/auth/[...nextauth]`, and `/api/voice/*` (consider Vercel BotID or Upstash rate-limit middleware).
5. **Replace `Math.random()` MedIntel-code generation** with a uniqueness-checked sequence — collision probability is non-trivial past ~10k patients.
6. **Add an audit log table** for escrow releases, prescription uploads, and KYC outcomes — required for dispute resolution.
7. **Switch from JWT to database sessions** if you need server-side session revocation.
8. **Send a real `User-Agent` to Overpass** matching your production domain — they return 406 to anonymous clients.

---

## Scripts reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Generate Prisma client + build for production |
| `npm run vercel-build` | What Vercel runs — `prisma generate && prisma db push --accept-data-loss --skip-generate && next build` |
| `npm run start` | Run the production build |
| `npm run db:migrate` | Create + apply a new migration (dev) |
| `npm run db:deploy` | Apply pending migrations (prod, only if you switch away from `db push`) |
| `npm run db:seed` | Populate `MedicalResource` with Lahore hospitals |
| `npm run db:reset` | Drop, re-push, re-seed (destructive) |
| `npm run lint` | Run ESLint |
| `npx tsx scripts/seed-demo-accounts.ts` | Seed demo patient + doctor + records + appointments |

---

## License

Proprietary — all rights reserved. This codebase is an MVP demonstration; contact the author before reuse.

---

Built by [@Ayyankhan101](https://github.com/Ayyankhan101) with [Claude Code](https://claude.com/claude-code).
