-- Tracks the highest quota-threshold alert already sent in the current billing
-- period. Reset to 0 on invoice.paid (when minutesUsed resets). Avoids
-- spamming the clinic admin with the same warning every cron tick.
ALTER TABLE "Clinic" ADD COLUMN "quotaAlertLevel" INTEGER NOT NULL DEFAULT 0;
