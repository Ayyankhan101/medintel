/**
 * Notification helpers — write into the in-app inbox.
 *
 * Failure must NEVER bubble. The inbox is a UX nicety; the canonical channel
 * is still email/SMS (handled by lib/email + lib/sms). If the inbox insert
 * fails we log + move on.
 */
import { prisma } from './prisma'
import { captureError } from './observability'

export type NotificationCategory =
  | 'appointment'
  | 'escrow'
  | 'prescription'
  | 'system'
  | 'review'

export interface NotifyInput {
  userId:   string
  category: NotificationCategory
  title:    string
  body:     string
  href?:    string
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({ data: input })
  } catch (e) {
    captureError(e, { op: 'notify', userId: input.userId, category: input.category })
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return
  try {
    await prisma.notification.createMany({ data: inputs })
  } catch (e) {
    captureError(e, { op: 'notifyMany', count: inputs.length })
  }
}
