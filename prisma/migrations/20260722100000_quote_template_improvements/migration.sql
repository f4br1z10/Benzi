ALTER TABLE "Quote" ADD COLUMN "paymentSchedule" TEXT;
ALTER TABLE "Quote" ADD COLUMN "incentivePercent" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "incentiveAmountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "netAfterIncentiveCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "Quote"
SET "netAfterIncentiveCents" = "totalCents"
WHERE "netAfterIncentiveCents" = 0;
