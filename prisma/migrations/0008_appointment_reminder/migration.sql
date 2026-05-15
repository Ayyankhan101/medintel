-- Add reminder dedupe marker. Null until the 1h SMS/email has been dispatched.
ALTER TABLE "Appointment" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Cron query filters on scheduledAt + status + null reminderSentAt; this partial
-- index keeps the lookup cheap even as the appointments table grows.
CREATE INDEX "Appointment_reminder_due_idx"
  ON "Appointment" ("scheduledAt")
  WHERE "status" = 'SCHEDULED' AND "reminderSentAt" IS NULL;
