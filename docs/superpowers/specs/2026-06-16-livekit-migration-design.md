# LiveKit Migration Design

**Date:** 2026-06-16
**Status:** Draft
**Goal:** Replace `twilio-video` (client SDK) with LiveKit for WebRTC video calls while keeping Twilio for Voice/SMS/WhatsApp.

## Why LiveKit

- **Cost:** Free 50k min/month on LiveKit Cloud, then ~$0.002/min — half Twilio's $0.004/min
- **Simplicity:** Pre-built React components (`@livekit/components-react`) replace ~200 lines of manual WebRTC with ~60 lines
- **No forced migration:** Twilio reversed their Video EOL in Oct 2024 — this is optional, driven by cost and simplicity
- **AI headroom:** LiveKit's agent framework enables live transcription later if needed

## Scope

### In scope

- Client SDK: `twilio-video` → `livekit-client` + `@livekit/components-react`
- Server SDK: add `livekit-server-sdk` for room management
- Token generation: Twilio JWT → LiveKit JWT in new `lib/livekit.ts`
- Room lifecycle: `completeVideoRoom()` uses LiveKit `RoomServiceClient`
- Adaptive quality: LiveKit's built-in `adaptiveStream` replaces manual network listener
- Env vars: add `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`

### Out of scope

- Recording callback (`api/consultation/recording-callback`): stays on Twilio — shared `TWILIO_AUTH_TOKEN` with Voice/SMS/WhatsApp; no benefit to migrating it
- Voice calls (`api/voice-call/*`): Twilio Programmable Voice, separate product
- WhatsApp (`api/whatsapp/*`): Twilio WhatsApp, separate product
- SMS (`lib/sms.ts`): Twilio SMS, separate product
- `lib/twilio.ts`: kept in place — still used by Voice/SMS/WhatsApp routes

## Affected files

| File | Change |
|---|---|
| `lib/livekit.ts` | **NEW** — `generateVideoToken()`, `appointmentRoomName()`, `completeVideoRoom()` |
| `components/consultation/VideoCall.tsx` | **REWRITE** — LiveKit components instead of twilio-video |
| `api/consultation/token/route.ts` | Import from `@/lib/livekit` instead of `@/lib/twilio` |
| `api/appointments/[id]/route.ts` | Import `completeVideoRoom` + `appointmentRoomName` from `@/lib/livekit` |
| `api/health/route.ts` | Add `LIVEKIT_API_KEY` check for video health |
| `package.json` | Swap `twilio-video` → `livekit-client`, `@livekit/components-react`, `@livekit/components-styles`, `livekit-server-sdk` |
| `.env.example` / `.env.local.example` | Add `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` |
| `docs/runbook.md` | Update env var docs |

## Design

### 1. Token generation (`lib/livekit.ts`)

Same interface as `lib/twilio.ts` so callers don't change:

```typescript
generateVideoToken(identity: string, roomName: string): string
appointmentRoomName(id: string): string           // unchanged helper
completeVideoRoom(roomName: string): Promise<void> // RoomServiceClient.deleteRoom
```

The `completeVideoRoom` function catches `NotFound` errors (room never created — same as Twilio's 20404).

### 2. VideoCall component

```tsx
import { LiveKitRoom, VideoTrack, AudioTrack, useTracks, useLocalParticipant, ControlBar } from '@livekit/components-react'
import '@livekit/components-styles'
```

- `<LiveKitRoom>` wraps the connection + video grid
- `ControlBar` handles mic/camera/end-call buttons — replaces manual `toggleMic`/`toggleCam`/`endCall`
- `useTracks()` for remote participant video
- `adaptiveStream` prop replaces the manual network quality listener
- Picture-in-picture local video via `useLocalParticipant`

The component shrinks from 224 lines → ~60 lines while retaining all features (mute, camera toggle, end call, connecting state, network-aware quality).

### 3. Token route

Import `generateVideoToken` + `appointmentRoomName` from `@/lib/livekit`. Route logic (auth, escrow check, consent check) stays identical.

### 4. Appointment cancel route

Import `completeVideoRoom` + `appointmentRoomName` from `@/lib/livekit`. Same `fire-and-forget` pattern (`void completeVideoRoom(...)`).

### 5. Env vars

```
LIVEKIT_API_KEY="API..."     # from LiveKit Cloud project
LIVEKIT_API_SECRET="..."      # from LiveKit Cloud project
LIVEKIT_URL="wss://medintel-xxxx.livekit.cloud"  # from LiveKit Cloud project
```

`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` stay — still needed by Voice/SMS/WhatsApp routes via `lib/twilio.ts`.

## Data flow (unchanged)

```
client page → POST /api/consultation/token → lib/livekit.generateVideoToken() → JWT
                                                                                ↓
client page passes { token, roomName } → <VideoCall token roomName onCallEnd />
```

The consultation page (`consultation/[id]/page.tsx`) receives the same `{ token, roomName, identity }` shape. Zero changes needed.

## Rollback

Migration is additive:
1. `lib/livekit.ts` and VideoCall rewrite coexist with old `lib/twilio.ts` during development
2. To roll back: revert `VideoCall.tsx` to Twilio, change imports back to `@/lib/twilio`, restore `twilio-video` in `package.json`
3. No data migration needed — LiveKit rooms are ephemeral like Twilio rooms

## Testing

1. **Unit:** `lib/livekit.ts` token generation (mock LiveKit SDK)
2. **Integration:** POST `/api/consultation/token` returns `{ token, roomName }`
3. **Manual:** Join a real consultation as patient + doctor, verify audio/video/mute/end work
4. **E2E:` tests/e2e/consultation.spec.ts` (if it exists) — update selectors for new component

## Future considerations

- **LiveKit Egress:** Replace Twilio recording callback with LiveKit Egress for recordings (separate project — needs retention policy review)
- **AI transcription:** LiveKit Agents can transcribe calls in real-time — useful for SOAP note auto-generation
- **Self-hosting:** If costs grow, LiveKit Server is open-source and can run on your own infra
