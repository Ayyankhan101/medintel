-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CLINIC_ADMIN';

-- CreateEnum
CREATE TYPE "ClinicPlan" AS ENUM ('STARTER', 'STANDARD', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "User"   ADD COLUMN "clinicId" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "clinicId" TEXT;

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "plan" "ClinicPlan" NOT NULL DEFAULT 'STARTER',
    "minutesQuota" INTEGER NOT NULL DEFAULT 2000,
    "minutesUsed"  INTEGER NOT NULL DEFAULT 0,
    "whatsappNumber" TEXT,
    "voiceNumber"    TEXT,
    "brandColor"     TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Clinic_slug_key"        ON "Clinic"("slug");
CREATE UNIQUE INDEX "Clinic_ownerUserId_key" ON "Clinic"("ownerUserId");

-- CreateTable
CREATE TABLE "ClinicUsage" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "channel"  TEXT NOT NULL,
    "minutes"  INTEGER NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClinicUsage_clinicId_createdAt_idx" ON "ClinicUsage"("clinicId", "createdAt" DESC);
CREATE INDEX "ClinicUsage_clinicId_channel_idx"   ON "ClinicUsage"("clinicId", "channel");

-- Indexes
CREATE INDEX "Doctor_clinicId_idx" ON "Doctor"("clinicId");

-- FKs
ALTER TABLE "User"        ADD CONSTRAINT "User_clinicId_fkey"        FOREIGN KEY ("clinicId")    REFERENCES "Clinic"("id") ON DELETE SET NULL  ON UPDATE CASCADE;
ALTER TABLE "Doctor"      ADD CONSTRAINT "Doctor_clinicId_fkey"      FOREIGN KEY ("clinicId")    REFERENCES "Clinic"("id") ON DELETE SET NULL  ON UPDATE CASCADE;
ALTER TABLE "Clinic"      ADD CONSTRAINT "Clinic_ownerUserId_fkey"   FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")   ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "ClinicUsage" ADD CONSTRAINT "ClinicUsage_clinicId_fkey" FOREIGN KEY ("clinicId")    REFERENCES "Clinic"("id") ON DELETE RESTRICT  ON UPDATE CASCADE;
