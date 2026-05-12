# MedIntel: Full-Stack Healthcare Infrastructure — Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MedIntel — a voice-first, AI-powered clinical infrastructure that connects patients (including illiterate/rural users) to verified doctors via an escrow-protected consultation system with full medical history management.

**Architecture:** Next.js 14 (App Router) monorepo with PostgreSQL/Prisma for data, AWS S3 for files, OpenAI for AI pipeline (Whisper STT + GPT-4 triage), Stripe Connect for escrow, and Google Maps for geo-resource tracking.

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, Prisma ORM, AWS S3, OpenAI API (Whisper + GPT-4), Stripe Connect, Google Maps API, Socket.io, Twilio Video (WebRTC), NextAuth.js, TailwindCSS, shadcn/ui, Zod, React Hook Form, Vitest, Playwright

---

## Subsystem Breakdown

Each subsystem has its own plan. Implement in order — later phases depend on earlier ones.

| # | Subsystem | Plan File | Depends On |
|---|-----------|-----------|------------|
| 1 | Foundation (DB, Auth, KYC/KYD) | `2026-05-11-01-foundation.md` | — |
| 2 | Voice Intake + AI Pipeline | `2026-05-11-02-voice-ai.md` | 1 |
| 3 | Triage & Severity Engine | `2026-05-11-03-triage.md` | 2 |
| 4 | Data Vault + OCR Scanner | `2026-05-11-04-data-vault.md` | 1 |
| 5 | Escrow & Payments | `2026-05-11-05-escrow.md` | 1 |
| 6 | Consultation Flow (Video + Prescription) | `2026-05-11-06-consultation.md` | 1, 5 |
| 7 | Emergency Protocol + Geo-Mapping | `2026-05-11-07-emergency.md` | 3 |
| 8 | Resource Tracking | `2026-05-11-08-resources.md` | 7 |
| 9 | Doctor Dashboard | `2026-05-11-09-doctor-dashboard.md` | 2, 3, 4, 6 |

---

## Global File Structure

```
medintel/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify/page.tsx
│   ├── (patient)/
│   │   ├── dashboard/page.tsx
│   │   ├── intake/page.tsx       # Voice/text symptom entry
│   │   ├── history/page.tsx
│   │   └── consultation/[id]/page.tsx
│   ├── (doctor)/
│   │   ├── dashboard/page.tsx
│   │   ├── queue/page.tsx
│   │   └── consultation/[id]/page.tsx
│   ├── (emergency)/
│   │   └── page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── kyc/verify/route.ts
│       ├── kyd/verify/route.ts
│       ├── voice/upload/route.ts
│       ├── voice/transcribe/route.ts
│       ├── triage/analyze/route.ts
│       ├── records/route.ts
│       ├── records/scan/route.ts
│       ├── appointments/route.ts
│       ├── escrow/create/route.ts
│       ├── escrow/release/route.ts
│       ├── prescriptions/route.ts
│       ├── emergency/route.ts
│       └── resources/nearby/route.ts
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── s3.ts                     # AWS S3 helpers
│   ├── openai.ts                 # OpenAI client + helpers
│   ├── stripe.ts                 # Stripe client + escrow helpers
│   ├── maps.ts                   # Google Maps helpers
│   ├── triage.ts                 # Severity + department logic
│   ├── emergency.ts              # Emergency detection logic
│   └── auth.ts                   # NextAuth config
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── components/
│   ├── voice/VoiceRecorder.tsx
│   ├── intake/SymptomSummary.tsx
│   ├── triage/SeverityBadge.tsx
│   ├── records/MedicalTimeline.tsx
│   ├── escrow/PaymentFlow.tsx
│   ├── consultation/VideoCall.tsx
│   ├── emergency/EmergencyAlert.tsx
│   └── maps/ResourceMap.tsx
├── types/
│   └── index.ts                  # Shared TypeScript types
└── tests/
    ├── unit/
    └── e2e/
```

---

## Environment Variables Required

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-south-1"
AWS_S3_BUCKET="medintel-files"

# OpenAI
OPENAI_API_KEY="..."

# Stripe
STRIPE_SECRET_KEY="..."
STRIPE_PUBLISHABLE_KEY="..."
STRIPE_WEBHOOK_SECRET="..."

# Google Maps
GOOGLE_MAPS_API_KEY="..."

# Twilio Video
TWILIO_ACCOUNT_SID="..."
TWILIO_API_KEY="..."
TWILIO_API_SECRET="..."

# PMDC (mock in dev)
PMDC_API_URL="https://api.pmdc.org.pk"
PMDC_API_KEY="..."

# NADRA (mock in dev)
NADRA_API_URL="https://api.nadra.gov.pk"
NADRA_API_KEY="..."
```

---

## Start Here

Begin with **Plan 01: Foundation** → `2026-05-11-01-foundation.md`
