-- Tracks how much has been refunded out of Escrow.amount. Null = no refund yet.
-- When refundedAmount = amount, status flips to REFUNDED. Partial values keep
-- status = RELEASED so the original transfer remains traceable.
ALTER TABLE "Escrow" ADD COLUMN "refundedAmount" DECIMAL(10, 2);
