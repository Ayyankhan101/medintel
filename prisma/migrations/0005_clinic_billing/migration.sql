-- AlterTable
ALTER TABLE "Clinic"
  ADD COLUMN "stripeCustomerId"     TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "currentPeriodEnd"     TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_stripeCustomerId_key"     ON "Clinic"("stripeCustomerId");
CREATE UNIQUE INDEX "Clinic_stripeSubscriptionId_key" ON "Clinic"("stripeSubscriptionId");
