/**
 * Audit logging — fire-and-forget. Failures must never block the caller
 * since auditing a successful action shouldn't roll back the action itself.
 *
 *   await audit('escrow.release', 'Appointment', appt.id, {
 *     amount: 1500, actorId: session.user.id, actorRole: 'DOCTOR',
 *   })
 *
 * Critical actions to log (must, per compliance):
 *   escrow.release / escrow.refund
 *   prescription.upload
 *   kyc.verify_patient
 *   kyd.approve / kyd.reject
 *   appointment.cancel / appointment.reschedule
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { captureError } from './observability'

type AuditMeta = Record<string, unknown> & {
  actorId?: string | null
  actorRole?: string | null
}

export async function audit(
  action: string,
  entityType: string,
  entityId: string,
  metadata?: AuditMeta,
): Promise<void> {
  const { actorId, actorRole, ...rest } = metadata ?? {}
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorId:   actorId   ?? null,
        actorRole: actorRole ?? null,
        metadata:  Object.keys(rest).length > 0 ? (rest as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })
  } catch (e) {
    // Never throw — auditing a successful action shouldn't roll it back.
    // Pipe to Sentry so compliance gaps are visible, not silently buried.
    captureError(e, { tag: 'audit.write_failed', action, entityType, entityId })
  }
}
