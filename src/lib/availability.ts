/**
 * Doctor availability — simple weekly window.
 *
 * Stored as JSON on Doctor.availability. null = always available (default for
 * newly onboarded doctors, prevents accidental "no slots" until the doctor
 * configures their hours).
 *
 *   {
 *     days:      [1, 2, 3, 4, 5],   // 1=Mon … 7=Sun (ISO weekday)
 *     startHour: 9,                  // local hour, inclusive (0–23)
 *     endHour:   17,                 // local hour, exclusive (1–24)
 *     timezone:  'Asia/Karachi',     // IANA TZ
 *   }
 *
 * The booking route and the booking UI both call isAvailable() — server is
 * authoritative; the UI just hides bad slots for UX.
 */

import { z } from 'zod'

export const AvailabilitySchema = z.object({
  days:        z.array(z.number().int().min(1).max(7)).min(1).max(7),
  startHour:   z.number().int().min(0).max(23),
  endHour:     z.number().int().min(1).max(24),
  startMinute: z.number().int().min(0).max(59).default(0),
  endMinute:   z.number().int().min(0).max(59).default(0),
  timezone:    z.string().default('Asia/Karachi'),
}).refine(
  v => (v.endHour * 60 + v.endMinute) > (v.startHour * 60 + v.startMinute),
  { message: 'end must be after start', path: ['endHour'] },
)

export type Availability = z.infer<typeof AvailabilitySchema>

export const DEFAULT_AVAILABILITY: Availability = {
  days:        [1, 2, 3, 4, 5, 6],
  startHour:   9,
  endHour:     18,
  startMinute: 0,
  endMinute:   0,
  timezone:    'Asia/Karachi',
}

/** Return null if input is null/undefined or malformed — caller treats null as "always available". */
export function parseAvailability(raw: unknown): Availability | null {
  if (raw == null) return null
  const parsed = AvailabilitySchema.safeParse(typeof raw === 'string' ? JSON.parse(raw) : raw)
  return parsed.success ? parsed.data : null
}

/** Is the candidate slot inside the doctor's working window?
 *  Compared in the doctor's local timezone (Asia/Karachi by default). */
export function isAvailable(av: Availability | null, at: Date): boolean {
  if (!av) return true
  // Intl gives us the local hour + weekday in the doctor's TZ.
  const tz = av.timezone || 'Asia/Karachi'
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
  const parts = fmt.formatToParts(at)
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? ''
  const hour    = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  const minute  = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  // Mon=1, Tue=2 ... Sun=7
  const isoDay = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[weekday] ?? 0
  if (!av.days.includes(isoDay)) return false
  const tMinutes     = hour * 60 + minute
  const startMinutes = av.startHour * 60 + (av.startMinute ?? 0)
  const endMinutes   = av.endHour   * 60 + (av.endMinute   ?? 0)
  return tMinutes >= startMinutes && tMinutes < endMinutes
}
