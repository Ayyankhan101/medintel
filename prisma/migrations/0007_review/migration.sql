-- CreateTable
CREATE TABLE "Review" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId"     TEXT NOT NULL,
    "doctorId"      TEXT NOT NULL,
    "rating"        INTEGER NOT NULL,
    "comment"       TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_range_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");
CREATE INDEX        "Review_doctorId_idx"      ON "Review"("doctorId", "createdAt" DESC);

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Review_patientId_fkey"     FOREIGN KEY ("patientId")     REFERENCES "Patient"("id")     ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Review_doctorId_fkey"      FOREIGN KEY ("doctorId")      REFERENCES "Doctor"("id")      ON DELETE RESTRICT ON UPDATE CASCADE;
