-- AlterTable
ALTER TABLE "TenantSubscription" ADD COLUMN     "maxProjects" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set maxProjects to the count of active subscription items for existing subscriptions
UPDATE "TenantSubscription" SET "maxProjects" = (
  SELECT COUNT(*) FROM "TenantSubscriptionItem"
  WHERE "TenantSubscriptionItem"."subscriptionId" = "TenantSubscription"."id"
  AND "TenantSubscriptionItem"."isActive" = true
);
