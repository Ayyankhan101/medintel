-- Explicit patient consent timestamp before video/voice session starts.
-- Required by PMDC / patient-rights guidance for telemedicine recording.
ALTER TABLE "Appointment" ADD COLUMN "recordingConsentAt" TIMESTAMP(3);
