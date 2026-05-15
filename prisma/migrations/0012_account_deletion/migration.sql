-- Soft-delete + anonymization marker. We can't hard-delete users because
-- prescriptions and audit logs are regulated medical records that must persist
-- per PMDC + Drugs Act 1976.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt") WHERE "deletedAt" IS NOT NULL;
