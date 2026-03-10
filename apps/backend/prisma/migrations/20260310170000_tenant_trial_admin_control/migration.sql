-- Add SYSADMIN-controlled trial fields per tenant
ALTER TABLE "Tenant"
ADD COLUMN "trialMonths" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "trialInterruptedAt" TIMESTAMP(3);
