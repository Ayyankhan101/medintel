-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "emailVerified"        TIMESTAMP(3),
  ADD COLUMN "emailVerifyToken"     TEXT,
  ADD COLUMN "emailVerifyExpires"   TIMESTAMP(3),
  ADD COLUMN "passwordResetToken"   TEXT,
  ADD COLUMN "passwordResetExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key"   ON "User"("emailVerifyToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
