-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('IMPROVED', 'UNCHANGED', 'WORSE');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "recoveryStatus" "RecoveryStatus";
