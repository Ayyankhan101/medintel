-- CreateTable
CREATE TABLE "ClinicInvite" (
    "id"        TEXT NOT NULL,
    "clinicId"  TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "role"      TEXT NOT NULL DEFAULT 'DOCTOR',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClinicInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicInvite_token_key"           ON "ClinicInvite"("token");
CREATE UNIQUE INDEX "ClinicInvite_clinicId_email_key"  ON "ClinicInvite"("clinicId", "email");
CREATE INDEX        "ClinicInvite_clinicId_idx"        ON "ClinicInvite"("clinicId", "createdAt" DESC);

ALTER TABLE "ClinicInvite"
  ADD CONSTRAINT "ClinicInvite_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
