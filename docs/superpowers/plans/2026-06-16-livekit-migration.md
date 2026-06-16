# LiveKit Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `twilio-video` client SDK with LiveKit for video calls while keeping Twilio for Voice/SMS/WhatsApp.

**Architecture:** Add `livekit-server-sdk` for server-side token/room management (`lib/livekit.ts`), replace `twilio-video` WebRTC manual code with `@livekit/components-react` pre-built components in `VideoCall.tsx`, and update import paths in two API routes. Twilio server SDK stays for unrelated Voice/SMS/WhatsApp routes.

**Tech Stack:** LiveKit Cloud, `livekit-client`, `@livekit/components-react`, `livekit-server-sdk`

**Depends on:** LiveKit Cloud project (sign up at livekit.io — free tier 50k min/mo)

---

## Files

| Action | Path | Purpose |
|--------|------|---------|
| Create | `lib/livekit.ts` | LiveKit token generation + room management (replaces Twilio video portion of `lib/twilio.ts`) |
| Modify | `components/consultation/VideoCall.tsx` | Swap `twilio-video` SDK for `@livekit/components-react` |
| Modify | `api/consultation/token/route.ts` | Import from `@/lib/livekit` |
| Modify | `api/appointments/[id]/route.ts` | Import `completeVideoRoom` + `appointmentRoomName` from `@/lib/livekit` |
| Modify | `api/health/route.ts` | Add `LIVEKIT_API_KEY` env check |
| Modify | `package.json` | Swap `twilio-video` for LiveKit packages |
| Modify | `.env.example` | Add `LIVEKIT_*` vars |
| Modify | `.env.local.example` | Add `LIVEKIT_*` vars |
| Modify | `docs/runbook.md` | Update env var docs |

---

### Task 1: Install LiveKit packages + set up LiveKit Cloud project

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Sign up for LiveKit Cloud**

Go to livekit.io/cloud, sign up, create a project. Copy the API Key, API Secret, and WebSocket URL (e.g. `wss://medintel-xxxx.livekit.cloud`).

- [ ] **Step 2: Install LiveKit packages and remove twilio-video**

Run:
```bash
npm uninstall twilio-video && npm install livekit-client @livekit/components-react @livekit/components-styles livekit-server-sdk
```

Expected: `twilio-video` removed from `package.json`, LiveKit packages added.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: swap twilio-video for livekit packages"
```

---

### Task 2: Create `lib/livekit.ts`

**Files:**
- Create: `lib/livekit.ts`

- [ ] **Step 1: Create the LiveKit server-side helper**

Create `lib/livekit.ts`:

```typescript
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

const API_KEY   = process.env.LIVEKIT_API_KEY!
const API_SECRET = process.env.LIVEKIT_API_SECRET!
const HOST      = process.env.LIVEKIT_HOST!

export function generateVideoToken(identity: string, roomName: string): string {
  const at = new AccessToken(API_KEY, API_SECRET, { identity, ttl: '1h' })
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  return at.toJwt()
}

export function appointmentRoomName(appointmentId: string): string {
  return `medintel-${appointmentId}`
}

export async function completeVideoRoom(roomName: string): Promise<void> {
  if (!API_KEY || !API_SECRET || !HOST) return

  const client = new RoomServiceClient(HOST, API_KEY, API_SECRET)
  try {
    await client.deleteRoom(roomName)
  } catch (e: unknown) {
    // LiveKit throws if room doesn't exist — safe to ignore (never started or already deleted).
    if (typeof e === 'object' && e !== null && 'status' in e && (e as { status: number }).status === 404) return
    console.error('[livekit] completeVideoRoom failed', roomName, e)
  }
}
```

Same 3-export interface as `lib/twilio.ts` so import-swap in API routes is zero-friction.

- [ ] **Step 2: Commit**

```bash
git add lib/livekit.ts
git commit -m "feat: add LiveKit token generation and room management"
```

---

### Task 3: Rewrite VideoCall component

**Files:**
- Modify: `components/consultation/VideoCall.tsx`

- [ ] **Step 1: Rewrite component to use LiveKit**

Replace the full content of `components/consultation/VideoCall.tsx`:

```tsx
'use client'
import { useState } from 'react'
import {
  LiveKitRoom, ControlBar,
  useTracks, useLocalParticipant, ParticipantLoop, ParticipantName,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-react'

interface Props {
  token: string
  roomName: string
  onCallEnd: () => void
}

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone])
  return (
    <ParticipantLoop participants={tracks.map(t => t.participant)}>
      <div className="flex items-center justify-center bg-gray-800 rounded-lg min-h-[200px]">
        <ParticipantName />
      </div>
    </ParticipantLoop>
  )
}

function LocalVideo() {
  const { localParticipant } = useLocalParticipant()
  if (!localParticipant) return null
  return (
    <div className="w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
      <ParticipantName />
    </div>
  )
}

export function VideoCall({ token, roomName, onCallEnd }: Props) {
  const [connected, setConnected] = useState(false)

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
      <LiveKitRoom
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_HOST ?? ''}
        token={token}
        connect={true}
        onConnected={() => setConnected(true)}
        onDisconnected={onCallEnd}
        adaptiveStream={true}
        video={true}
        audio={true}
        className="w-full h-full"
      >
        {/* Remote participants */}
        {connected && <VideoGrid />}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-20 right-4 z-10">
          <LocalVideo />
        </div>

        {/* Connecting overlay */}
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900/80 z-20">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Connecting to consultation room...</p>
            </div>
          </div>
        )}

        {/* Control bar at the bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <ControlBar
            controls={{ microphone: true, camera: true, screenShare: false, leave: true }}
            onLeave={onCallEnd}
          />
        </div>
      </LiveKitRoom>
    </div>
  )
}
```

- [ ] **Step 2: Build to check for compile errors**

Run: `npx next build 2>&1 | head -30`

Expected: No TypeScript errors related to VideoCall.

- [ ] **Step 3: Commit**

```bash
git add components/consultation/VideoCall.tsx
git commit -m "feat: rewrite VideoCall with LiveKit components"
```

---

### Task 4: Update API route imports

**Files:**
- Modify: `api/consultation/token/route.ts`
- Modify: `api/appointments/[id]/route.ts`

- [ ] **Step 1: Update token route import**

In `api/consultation/token/route.ts`, change line 5 from:
```typescript
import { generateVideoToken, appointmentRoomName } from '@/lib/twilio'
```
to:
```typescript
import { generateVideoToken, appointmentRoomName } from '@/lib/livekit'
```

- [ ] **Step 2: Update appointment route import**

In `api/appointments/[id]/route.ts`, change line 7 from:
```typescript
import { completeVideoRoom, appointmentRoomName } from '@/lib/twilio'
```
to:
```typescript
import { completeVideoRoom, appointmentRoomName } from '@/lib/livekit'
```

- [ ] **Step 3: Build to verify**

Run: `npx next build 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add api/consultation/token/route.ts api/appointments/[id]/route.ts
git commit -m "refactor: point video routes to LiveKit instead of Twilio"
```

---

### Task 5: Update env files + health check + runbook

**Files:**
- Modify: `.env.example`
- Modify: `.env.local.example`
- Modify: `api/health/route.ts`
- Modify: `docs/runbook.md`

- [ ] **Step 1: Add LiveKit vars to `.env.example`**

After the existing Twilio Video env vars (lines 41-43), add:

```env
# LiveKit (video calls)
LIVEKIT_API_KEY=""
LIVEKIT_API_SECRET=""
LIVEKIT_HOST="wss://your-project.livekit.cloud"
NEXT_PUBLIC_LIVEKIT_HOST="wss://your-project.livekit.cloud"
```

- [ ] **Step 2: Add LiveKit vars to `.env.local.example`**

Same as step 1, add after the Twilio Video vars.

- [ ] **Step 3: Update health check**

In `api/health/route.ts`, find the Twilio env check (line 56). Change:
```typescript
twilio:    configured('TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET'),
```
to:
```typescript
twilio: configured('TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET'),
livekit: configured('LIVEKIT_API_KEY', 'LIVEKIT_HOST'),
```

- [ ] **Step 4: Update runbook**

In `docs/runbook.md`, find the Twilio env var section. Add a note that video now uses LiveKit (LIVEKIT_* vars) and TWILIO_ACCOUNT_SID / TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET now only apply to Voice/SMS/WhatsApp.

- [ ] **Step 5: Commit**

```bash
git add .env.example .env.local.example api/health/route.ts docs/runbook.md
git commit -m "chore: add LiveKit env vars, update health check and docs"
```

---

### Task 6: Run full build + verify

**Files:**
- Verify: whole project builds

- [ ] **Step 1: Run full build**

Run: `npm run build 2>&1`

Expected: Build succeeds with no errors. The `twilio-video` package is gone from node_modules; no imports remain.

- [ ] **Step 2: Run tests**

Run: `npm test 2>&1 | tail -10`

Expected: All tests pass.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build issues from LiveKit migration"
```
