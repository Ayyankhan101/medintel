# Plan 09: Doctor Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doctors see incoming appointments with pre-filled AI summaries, patient history by MedIntel code, severity badges, and queue management — so they never waste time on intake questions the AI already answered.

**Architecture:** Doctor queue is a list of today's appointments sorted by severity (CRITICAL first). Each appointment card shows AI summary + triage result + linked patient history. Doctor can join the call or look up any patient by MedIntel Code.

**Tech Stack:** Next.js App Router, Prisma, shadcn/ui

**Depends on:** Plans 01–06 (all data exists by this point)

---

## Files

| Action | Path | Purpose |
|--------|------|---------|
| Create | `app/api/appointments/route.ts` | Create draft + list appointments |
| Create | `app/api/appointments/[id]/route.ts` | Get single appointment detail |
| Create | `app/(doctor)/dashboard/page.tsx` | Doctor's main queue page |
| Create | `app/(doctor)/queue/page.tsx` | Today's appointment queue |
| Create | `components/doctor/AppointmentCard.tsx` | Queue item with AI summary |
| Create | `components/doctor/PatientLookup.tsx` | MedIntel code lookup panel |

---

### Task 1: Appointments API

**Files:**
- Create: `app/api/appointments/route.ts`
- Create: `app/api/appointments/[id]/route.ts`

- [ ] **Step 1: Create appointments endpoint**

Create `app/api/appointments/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createSchema = z.object({
  doctorId: z.string().optional(),
  scheduledAt: z.string().datetime(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patient = await prisma.patient.findFirst({ where: { user: { id: session.user.id } } })
  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  // If no doctorId, create a draft appointment (pre-booking, before doctor selection)
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: parsed.data.doctorId ?? (await getAnyDoctorId()),
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
  })

  return NextResponse.json({ appointmentId: appointment.id }, { status: 201 })
}

async function getAnyDoctorId(): Promise<string> {
  // Placeholder: returns first available verified doctor
  const doctor = await prisma.doctor.findFirst({ where: { kydStatus: 'VERIFIED' } })
  if (!doctor) throw new Error('No verified doctors available')
  return doctor.id
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role === 'DOCTOR') {
    const doctor = await prisma.doctor.findFirst({ where: { user: { id: session.user.id } } })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: {
          include: { user: { select: { medIntelCode: true, email: true, phone: true } } },
        },
        escrow: { select: { status: true } },
      },
      orderBy: [
        { severityScore: 'desc' },
        { scheduledAt: 'asc' },
      ],
    })

    return NextResponse.json(appointments)
  }

  // Patient: return own appointments
  const patient = await prisma.patient.findFirst({ where: { user: { id: session.user.id } } })
  if (!patient) return NextResponse.json([], { status: 200 })

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: { doctor: true, escrow: { select: { status: true } } },
    orderBy: { scheduledAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(appointments)
}
```

- [ ] **Step 2: Create single appointment endpoint**

Create `app/api/appointments/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          user: { select: { medIntelCode: true, email: true, phone: true } },
        },
      },
      doctor: {
        include: { user: { select: { email: true } } },
      },
      escrow: true,
    },
  })

  if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify caller is patient or doctor on this appointment
  const isPatient = appointment.patient.user.email === session.user.email
  const isDoctor = appointment.doctor.user.email === session.user.email
  if (!isPatient && !isDoctor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(appointment)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/appointments/
git commit -m "feat: add appointments API (create, list, get-by-id)"
```

---

### Task 2: AppointmentCard Component

**Files:**
- Create: `components/doctor/AppointmentCard.tsx`

- [ ] **Step 1: Build appointment queue card**

Create `components/doctor/AppointmentCard.tsx`:
```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SeverityBadge } from '@/components/triage/SeverityBadge'
import { Clock, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface Appointment {
  id: string
  scheduledAt: string
  status: string
  aiSummary: string | null
  department: string | null
  severityScore: number | null
  severityLevel: 'ROUTINE' | 'URGENT' | 'CRITICAL' | null
  patient: {
    user: { medIntelCode: string | null; phone: string }
  }
  escrow: { status: string } | null
}

interface Props { appointment: Appointment }

const statusColor: Record<string, string> = {
  SCHEDULED:   'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-gray-100 text-gray-500',
}

export function AppointmentCard({ appointment: a }: Props) {
  const time = new Date(a.scheduledAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
  const paid = a.escrow?.status === 'HELD' || a.escrow?.status === 'RELEASED'

  return (
    <Card className={`border-l-4 ${a.severityLevel === 'CRITICAL' ? 'border-l-red-500' : a.severityLevel === 'URGENT' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-3 h-3" /> {time}
              </span>
              <Badge className={statusColor[a.status] ?? statusColor.SCHEDULED}>{a.status}</Badge>
              {paid && (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  <CreditCard className="w-3 h-3" /> Paid
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">MedIntel: {a.patient.user.medIntelCode ?? 'N/A'}</p>
          </div>
          {a.severityScore && a.severityLevel && (
            <SeverityBadge score={a.severityScore} level={a.severityLevel} />
          )}
        </div>

        {a.aiSummary && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">AI Pre-Summary</p>
            <p className="text-sm text-gray-700">{a.aiSummary}</p>
          </div>
        )}

        {a.department && (
          <p className="text-xs text-gray-500">Department: <strong>{a.department}</strong></p>
        )}

        <div className="flex gap-2">
          <Link href={`/doctor/consultation/${a.id}`} className="flex-1">
            <Button
              className="w-full"
              disabled={a.status === 'COMPLETED' || a.status === 'CANCELLED' || !paid}
              variant={a.severityLevel === 'CRITICAL' ? 'destructive' : 'default'}
            >
              {a.status === 'COMPLETED' ? 'Done' : !paid ? 'Awaiting Payment' : 'Start Consultation'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/doctor/AppointmentCard.tsx
git commit -m "feat: add appointment queue card with AI summary and severity"
```

---

### Task 3: Patient Lookup Panel

**Files:**
- Create: `components/doctor/PatientLookup.tsx`

- [ ] **Step 1: Build the MedIntel code lookup panel**

Create `components/doctor/PatientLookup.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface RecordGroup {
  SURGERY: any[]
  ALLERGY: any[]
  CHRONIC_MED: any[]
  LAB_REPORT: any[]
  PRESCRIPTION: any[]
}

export function PatientLookup() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ medIntelCode: string; recordCount: number; grouped: RecordGroup } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function lookup() {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    const res = await fetch(`/api/records/lookup?code=${encodeURIComponent(code.trim())}`)
    if (!res.ok) { setError('Patient not found'); setLoading(false); return }
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-gray-50">
      <h3 className="font-semibold text-gray-800">Patient History Lookup</h3>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="MED-PK-XXXX"
          onKeyDown={e => e.key === 'Enter' && lookup()}
        />
        <Button onClick={lookup} disabled={loading}>Look Up</Button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{result.recordCount} records for <strong>{result.medIntelCode}</strong></p>

          {result.grouped.ALLERGY.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-bold text-red-700 mb-2">⚠️ ALLERGIES</p>
              <div className="flex gap-1 flex-wrap">
                {result.grouped.ALLERGY.map(r => <Badge key={r.id} className="bg-red-100 text-red-700">{r.title}</Badge>)}
              </div>
            </div>
          )}

          {result.grouped.CHRONIC_MED.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-bold text-amber-700 mb-2">💊 CHRONIC MEDICATIONS</p>
              {result.grouped.CHRONIC_MED.map(r => (
                <p key={r.id} className="text-sm text-gray-700">{r.title}: <span className="text-gray-500">{r.content.slice(0, 100)}</span></p>
              ))}
            </div>
          )}

          {result.grouped.SURGERY.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-bold text-blue-700 mb-2">🔪 PAST SURGERIES</p>
              {result.grouped.SURGERY.map(r => (
                <p key={r.id} className="text-sm text-gray-700">{r.title} — {new Date(r.recordedAt).toLocaleDateString('en-PK')}</p>
              ))}
            </div>
          )}

          {result.grouped.LAB_REPORT.slice(0, 3).map(r => (
            <div key={r.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs font-bold text-purple-700">Lab: {r.title}</p>
              <p className="text-sm text-gray-600 mt-1">{r.content.slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/doctor/PatientLookup.tsx
git commit -m "feat: add patient history lookup panel for doctors"
```

---

### Task 4: Doctor Dashboard + Queue Pages

**Files:**
- Create: `app/(doctor)/dashboard/page.tsx`
- Create: `app/(doctor)/queue/page.tsx`

- [ ] **Step 1: Create doctor dashboard**

Create `app/(doctor)/dashboard/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { AppointmentCard } from '@/components/doctor/AppointmentCard'
import { PatientLookup } from '@/components/doctor/PatientLookup'
import { Badge } from '@/components/ui/badge'

export default function DoctorDashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/appointments')
      .then(r => r.json())
      .then(data => { setAppointments(data); setLoading(false) })
  }, [])

  const critical = appointments.filter(a => a.severityLevel === 'CRITICAL')
  const urgent = appointments.filter(a => a.severityLevel === 'URGENT')
  const routine = appointments.filter(a => a.severityLevel === 'ROUTINE' || !a.severityLevel)

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today's Queue</h1>
        <div className="flex gap-2">
          {critical.length > 0 && <Badge className="bg-red-100 text-red-700">{critical.length} Critical</Badge>}
          {urgent.length > 0 && <Badge className="bg-yellow-100 text-yellow-700">{urgent.length} Urgent</Badge>}
          <Badge className="bg-gray-100 text-gray-700">{routine.length} Routine</Badge>
        </div>
      </div>

      <PatientLookup />

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        ))}</div>
      ) : appointments.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No appointments scheduled for today.</p>
      ) : (
        <div className="space-y-3">
          {critical.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Critical — See First</h2>
              {critical.map(a => <AppointmentCard key={a.id} appointment={a} />)}
            </>
          )}
          {urgent.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-yellow-600 uppercase tracking-wide">Urgent</h2>
              {urgent.map(a => <AppointmentCard key={a.id} appointment={a} />)}
            </>
          )}
          {routine.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Routine</h2>
              {routine.map(a => <AppointmentCard key={a.id} appointment={a} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Test doctor dashboard**

```bash
npm run dev
```

Log in as a doctor. Navigate to `http://localhost:3000/doctor/dashboard`. Verify:
- Appointments are grouped by severity (Critical → Urgent → Routine)
- AI summary appears in amber box for each appointment
- Patient lookup panel works with a MedIntel code

- [ ] **Step 3: Commit**

```bash
git add app/(doctor)/dashboard/ app/(doctor)/queue/
git commit -m "feat: add doctor dashboard with AI-sorted queue and patient lookup"
```

---

## Final Integration Checklist

After completing all 9 plans, verify the complete user journey:

- [ ] **Patient journey**: Register with CNIC → get MedIntel code → login → speak symptoms → see AI summary with severity → book verified doctor → pay (escrow) → join video call → receive prescription in medical history
- [ ] **Doctor journey**: Register → 3-tier KYD verification → set up Stripe Connect → login → see today's queue sorted by severity with AI pre-summaries → look up patient history by code → start call → upload prescription → payment auto-released
- [ ] **Emergency journey**: Enter chest pain + troponin → system detects MI → audio guidance plays → 3 nearest Cath Lab hospitals shown on map
- [ ] **Resource lookup**: Search "oxygen cylinder" → see suppliers with stock counts and one-click directions

---

**All 9 plans complete. MedIntel is fully implemented.**
