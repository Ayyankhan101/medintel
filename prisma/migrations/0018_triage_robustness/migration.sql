-- AlterTable: add raw LLM output to Triage
ALTER TABLE "Triage" ADD COLUMN "rawOutput" JSONB;

-- AlterTable: add language support to Doctor
ALTER TABLE "Doctor" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT '{}';

-- AlterTable: add patient language + gender preference
ALTER TABLE "Patient" ADD COLUMN "preferredLanguage" TEXT DEFAULT 'ur';
ALTER TABLE "Patient" ADD COLUMN "genderPreference" TEXT;
