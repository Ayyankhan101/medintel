-- CreateTable: Notification (in-app inbox)
CREATE TABLE "Notification" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "category"  TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "href"      TEXT,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX "Notification_userId_readAt_idx"    ON "Notification"("userId", "readAt");

-- AlterTable: Review moderation columns
ALTER TABLE "Review" ADD COLUMN "hiddenAt"     TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "hiddenBy"     TEXT;
ALTER TABLE "Review" ADD COLUMN "hiddenReason" TEXT;
