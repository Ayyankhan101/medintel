# Plan 06: Consultation Flow (Video Call + Digital Prescription)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect patient and doctor in a video call using Twilio Video. After the call, doctor uploads a digital prescription. On upload, escrow is automatically released to the doctor's wallet.

**Architecture:** Twilio Video rooms (created per appointment). Doctor and patient each get a Twilio access token from an API route. When doctor clicks "End & Upload Prescription," they upload a PDF/image to S3, the prescription URL is saved to the Appointment, and the escrow release endpoint is called automatically.

**Tech Stack:** Twilio Video JS SDK, AWS S3, Next.js API routes, Prisma

**Depends on:** Plan 01 (Appointment table), Plan 05 (Escrow release endpoint)

---

## Files

| Action | Path | Purpose |
|--------|------|---------|
| Create | `lib/twilio.ts` | Twilio Video token generation |
| Create | `app/api/consultation/token/route.ts` | Returns Twilio access token |
| Create | `app/api/prescriptions/route.ts` | Doctor uploads prescription + triggers escrow release |
| Create | `components/consultation/VideoCall.tsx` | WebRTC video call UI |
| Create | `components/consultation/PrescriptionUploader.tsx` | Doctor's prescription upload form |
| Create | `app/(patient)/consultation/[id]/page.tsx` | Patient consultation page |
| Create | `app/(doctor)/consultation/[id]/page.tsx` | Doctor consultation page |

---

### Task 1: Twilio Video Token Generator

**Files:**
- Create: `lib/twilio.ts`

- [ ] **Step 1: Install Twilio SDK**

```bash
npm install twilio
npm install -D @types/twilio
```

- [ ] **Step 2: Implement token generator**

Create `lib/twilio.ts`:
```typescript
import twilio from 'twilio'
const AccessToken = twilio.jwt.AccessToken
const VideoGrant = AccessToken.VideoGrant

export function generateVideoToken(identity: string, roomName: string): string {
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity, ttl: 3600 }
  )
  const videoGrant = new VideoGrant({ room: roomName })
  token.addGrant(videoGrant)
  return token.toJwt()
}

export function appointmentRoomName(appointmentId: string): string {
  return `medintel-${appointmentId}`
}
```

- [ ] **Step 3: Create token API route**

Create `app/api/consultation/token/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateVideoToken, appointmentRoomName } from '@/lib/twilio'

const schema = z.object({ appointmentId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      escrow: true,
    },
  })

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  const isPatient = appointment.patient.user.id === session.user.id
  const isDoctor = appointment.doctor.user.id === session.user.id
  if (!isPatient && !isDoctor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Patients must pay before joining
  if (isPatient && appointment.escrow?.status !== 'HELD') {
    return NextResponse.json({ error: 'Payment required before joining consultation' }, { status: 402 })
  }

  const identity = session.user.id
  const roomName = appointmentRoomName(appointment.id)
  const token = generateVideoToken(identity, roomName)

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: 'IN_PROGRESS' },
  })

  return NextResponse.json({ token, roomName, identity })
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/twilio.ts app/api/consultation/
git commit -m "feat: add Twilio Video token generation"
```

---

### Task 2: Prescription Upload + Escrow Trigger

**Files:**
- Create: `app/api/prescriptions/route.ts`

- [ ] **Step 1: Create prescription upload endpoint**

Create `app/api/prescriptions/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { releaseEscrowToDoctor } from '@/lib/stripe'

const schema = z.object({
  appointmentId: z.string().min(1),
  prescriptionS3Key: z.string().min(1),
  prescriptionText: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'DOCTOR') {
    return NextResponse.json({ error: 'Only doctors can upload prescriptions' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: {
      escrow: true,
      doctor: { include: { user: true } },
    },
  })

  if (!appointment) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  if (appointment.doctor.user.id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Save prescription
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      prescriptionUrl: parsed.data.prescriptionS3Key,
      prescriptionText: parsed.data.prescriptionText,
    },
  })

  // Also save to patient's medical records
  const patient = await prisma.patient.findFirst({ where: { userId: appointment.patient.userId } })
  if (patient) {
    await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        type: 'PRESCRIPTION',
        title: `Prescription — ${new Date().toLocaleDateString('en-PK')}`,
        content: parsed.data.prescriptionText ?? 'See attached file',
        fileUrl: parsed.data.prescriptionS3Key,
        recordedAt: new Date(),
      },
    })
  }

  // Auto-release escrow
  if (appointment.escrow?.status === 'HELD' && appointment.doctor.stripeAccountId) {
    await releaseEscrowToDoctor(
      appointment.escrow.stripePaymentIntentId,
      appointment.doctor.stripeAccountId,
      Number(appointment.escrow.amount)
    )
    await prisma.escrow.update({
      where: { id: appointment.escrow.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    })
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
  }

  return NextResponse.json({ message: 'Prescription saved and payment released' })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/prescriptions/
git commit -m "feat: add prescription upload with automatic escrow release"
```

---

### Task 3: VideoCall Component

**Files:**
- Create: `components/consultation/VideoCall.tsx`

- [ ] **Step 1: Install Twilio Video JS SDK**

```bash
npm install twilio-video
npm install -D @types/twilio-video
```

- [ ] **Step 2: Build the VideoCall component**

Create `components/consultation/VideoCall.tsx`:
```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import type { Room, RemoteParticipant, LocalVideoTrack, RemoteVideoTrack, LocalAudioTrack, RemoteAudioTrack } from 'twilio-video'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react'

interface Props {
  token: string
  roomName: string
  onCallEnd: () => void
}

export function VideoCall({ token, roomName, onCallEnd }: Props) {
  const [room, setRoom] = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let activeRoom: Room
    async function connect() {
      const Video = (await import('twilio-video')).default
      activeRoom = await Video.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 640, height: 480 },
      })
      setRoom(activeRoom)
      setConnected(true)

      // Attach local video
      activeRoom.localParticipant.videoTracks.forEach(pub => {
        if (pub.track && localVideoRef.current) {
          localVideoRef.current.appendChild((pub.track as LocalVideoTrack).attach())
        }
      })

      // Attach existing remote participants
      activeRoom.participants.forEach(attachParticipant)
      activeRoom.on('participantConnected', attachParticipant)
      activeRoom.on('participantDisconnected', detachParticipant)
    }

    function attachParticipant(participant: RemoteParticipant) {
      participant.tracks.forEach(pub => {
        if (pub.isSubscribed && pub.track && remoteVideoRef.current) {
          remoteVideoRef.current.appendChild((pub.track as RemoteVideoTrack | RemoteAudioTrack).attach())
        }
      })
      participant.on('trackSubscribed', track => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.appendChild((track as RemoteVideoTrack | RemoteAudioTrack).attach())
        }
      })
    }

    function detachParticipant(participant: RemoteParticipant) {
      participant.tracks.forEach(pub => {
        if (pub.track) (pub.track as RemoteVideoTrack | RemoteAudioTrack).detach().forEach(el => el.remove())
      })
    }

    connect()
    return () => { activeRoom?.disconnect() }
  }, [token, roomName])

  function toggleMic() {
    room?.localParticipant.audioTracks.forEach(pub => {
      micOn ? (pub.track as LocalAudioTrack).disable() : (pub.track as LocalAudioTrack).enable()
    })
    setMicOn(!micOn)
  }

  function toggleCam() {
    room?.localParticipant.videoTracks.forEach(pub => {
      camOn ? (pub.track as LocalVideoTrack).disable() : (pub.track as LocalVideoTrack).enable()
    })
    setCamOn(!camOn)
  }

  function endCall() {
    room?.disconnect()
    onCallEnd()
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
      {/* Remote video (full screen) */}
      <div ref={remoteVideoRef} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

      {/* Local video (picture-in-picture) */}
      <div
        ref={localVideoRef}
        className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
      />

      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Connecting to consultation room...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        <Button
          size="icon"
          variant={micOn ? 'secondary' : 'destructive'}
          onClick={toggleMic}
          className="rounded-full w-12 h-12"
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant={camOn ? 'secondary' : 'destructive'}
          onClick={toggleCam}
          className="rounded-full w-12 h-12"
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={endCall}
          className="rounded-full w-12 h-12"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/consultation/VideoCall.tsx
git commit -m "feat: add Twilio Video WebRTC call component"
```

---

### Task 4: Consultation Pages

**Files:**
- Create: `components/consultation/PrescriptionUploader.tsx`
- Create: `app/(patient)/consultation/[id]/page.tsx`
- Create: `app/(doctor)/consultation/[id]/page.tsx`

- [ ] **Step 1: Create PrescriptionUploader**

Create `components/consultation/PrescriptionUploader.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface Props {
  appointmentId: string
  onUploaded: () => void
}

export function PrescriptionUploader({ appointmentId, onUploaded }: Props) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus('Uploading prescription...')

    try {
      let s3Key = ''
      if (file) {
        const presignRes = await fetch('/api/voice/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        })
        const { uploadUrl, s3Key: key } = await presignRes.json()
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        s3Key = key
      }

      setStatus('Saving and releasing payment...')
      await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, prescriptionS3Key: s3Key, prescriptionText: text }),
      })

      setStatus('Done! Payment released to your account.')
      onUploaded()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-xl bg-green-50">
      <h3 className="font-semibold text-green-900">Upload Prescription</h3>
      <p className="text-sm text-green-700">
        Once you upload the prescription, payment will be automatically released to your account.
      </p>
      <div>
        <Label>Prescription Text</Label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Rx: Aspirin 75mg once daily for 30 days..."
          className="min-h-[120px]"
          required
        />
      </div>
      <div>
        <Label>Attach File (optional)</Label>
        <Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button type="submit" disabled={loading || !text} className="w-full bg-green-600 hover:bg-green-700">
        {loading ? status : 'Upload Prescription & Collect Payment'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create patient consultation page**

Create `app/(patient)/consultation/[id]/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { VideoCall } from '@/components/consultation/VideoCall'
import { PaymentFlow } from '@/components/escrow/PaymentFlow'

export default function PatientConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = use(params)
  const [phase, setPhase] = useState<'payment' | 'call' | 'done'>('payment')
  const [videoToken, setVideoToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [appointment, setAppointment] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then(r => r.json())
      .then(data => {
        setAppointment(data)
        if (data.escrow?.status === 'HELD') setPhase('call')
      })
  }, [appointmentId])

  async function joinCall() {
    const res = await fetch('/api/consultation/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    })
    const { token, roomName } = await res.json()
    setVideoToken(token)
    setRoomName(roomName)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Your Consultation</h1>

      {phase === 'payment' && appointment && (
        <PaymentFlow
          appointmentId={appointmentId}
          doctorName={appointment.doctor?.specialization ?? 'Doctor'}
          fee={Number(appointment.doctor?.consultationFee ?? 0)}
          onPaymentComplete={() => setPhase('call')}
        />
      )}

      {phase === 'call' && !videoToken && (
        <div className="space-y-4 text-center">
          <p className="text-gray-600">Payment confirmed. Your doctor will join shortly.</p>
          <button onClick={joinCall} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg">
            Join Video Call
          </button>
        </div>
      )}

      {phase === 'call' && videoToken && (
        <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('done')} />
      )}

      {phase === 'done' && (
        <div className="text-center space-y-3 py-12">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold">Consultation Complete</h2>
          <p className="text-gray-500">Your prescription has been added to your medical history.</p>
          <a href="/history" className="text-blue-600 hover:underline block">View Medical History →</a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create doctor consultation page**

Create `app/(doctor)/consultation/[id]/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { use } from 'react'
import { VideoCall } from '@/components/consultation/VideoCall'
import { PrescriptionUploader } from '@/components/consultation/PrescriptionUploader'

export default function DoctorConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appointmentId } = use(params)
  const [phase, setPhase] = useState<'pre' | 'call' | 'prescription' | 'done'>('pre')
  const [videoToken, setVideoToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [patientHistory, setPatientHistory] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then(r => r.json())
      .then(async data => {
        if (data.patient?.user?.medIntelCode) {
          const historyRes = await fetch(`/api/records/lookup?code=${data.patient.user.medIntelCode}`)
          if (historyRes.ok) setPatientHistory(await historyRes.json())
        }
      })
  }, [appointmentId])

  async function joinCall() {
    const res = await fetch('/api/consultation/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    })
    const { token, roomName } = await res.json()
    setVideoToken(token)
    setRoomName(roomName)
    setPhase('call')
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Consultation</h1>

      {patientHistory && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <strong>Patient History ({patientHistory.recordCount} records):</strong>
          {patientHistory.grouped.ALLERGY.length > 0 && (
            <p className="text-red-700 mt-1">⚠️ Allergies: {patientHistory.grouped.ALLERGY.map((r: any) => r.title).join(', ')}</p>
          )}
          {patientHistory.grouped.CHRONIC_MED.length > 0 && (
            <p className="text-amber-700">💊 Chronic Meds: {patientHistory.grouped.CHRONIC_MED.map((r: any) => r.title).join(', ')}</p>
          )}
        </div>
      )}

      {phase === 'pre' && (
        <button onClick={joinCall} className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg">
          Start Video Call
        </button>
      )}

      {phase === 'call' && videoToken && (
        <div className="space-y-4">
          <VideoCall token={videoToken} roomName={roomName} onCallEnd={() => setPhase('prescription')} />
        </div>
      )}

      {phase === 'prescription' && (
        <PrescriptionUploader appointmentId={appointmentId} onUploaded={() => setPhase('done')} />
      )}

      {phase === 'done' && (
        <div className="text-center py-8 space-y-2">
          <div className="text-4xl">💰</div>
          <p className="font-semibold text-green-700">Prescription uploaded. Payment released to your account.</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/consultation/ app/(patient)/consultation/ app/(doctor)/consultation/
git commit -m "feat: add full consultation flow with video call and prescription upload"
```

---

**Consultation flow complete.** Proceed to `2026-05-11-07-emergency.md`.
