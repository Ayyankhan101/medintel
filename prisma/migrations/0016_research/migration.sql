-- AlterTable: add researchConsent to Patient
ALTER TABLE "Patient" ADD COLUMN "researchConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: ResearchInsight
CREATE TABLE "ResearchInsight" (
    "id"          TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowDays"  INTEGER NOT NULL,
    "totalCases"  INTEGER NOT NULL,
    "avgSeverity" DOUBLE PRECISION NOT NULL,
    "summary"     TEXT NOT NULL,
    "keyFindings" TEXT[],
    "topDiseases" JSONB NOT NULL,
    "modelUsed"   TEXT,

    CONSTRAINT "ResearchInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchInsight_generatedAt_idx" ON "ResearchInsight"("generatedAt" DESC);
