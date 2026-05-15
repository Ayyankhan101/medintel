-- Free-text reason captured at cancellation / refund time. Optional.
ALTER TABLE "Appointment" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "cancelledBy"        TEXT;   -- 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'SYSTEM'

ALTER TABLE "Escrow"      ADD COLUMN "refundReason"       TEXT;

-- Cron query for no-show refunds filters on status + scheduledAt + a null
-- completedAt; partial index keeps that scan tight as history grows.
CREATE INDEX "Appointment_noshow_idx"
  ON "Appointment" ("scheduledAt")
  WHERE "status" = 'SCHEDULED';
