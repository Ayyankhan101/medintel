-- CreateEnum
CREATE TYPE "DoctorTier" AS ENUM ('JUNIOR', 'SENIOR');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN "tier" "DoctorTier" NOT NULL DEFAULT 'JUNIOR';
