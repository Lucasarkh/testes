CREATE TABLE "TrackingVisitor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "projectId" TEXT,
    "realtorLinkId" TEXT,
    "userId" TEXT,
    "ip" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "landingPage" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ftUtmSource" TEXT,
    "ftUtmMedium" TEXT,
    "ftUtmCampaign" TEXT,
    "ftUtmContent" TEXT,
    "ftUtmTerm" TEXT,
    "ftReferrer" TEXT,
    "ltUtmSource" TEXT,
    "ltUtmMedium" TEXT,
    "ltUtmCampaign" TEXT,
    "ltUtmContent" TEXT,
    "ltUtmTerm" TEXT,
    "ltReferrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "referrer" TEXT,
    "lastRealtorAt" TIMESTAMP(3),
    CONSTRAINT "TrackingVisitor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TrackingSession" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "visitorId" TEXT;

INSERT INTO "TrackingVisitor" (
    "id",
    "tenantId",
    "projectId",
    "realtorLinkId",
    "userId",
    "ip",
    "ipHash",
    "userAgent",
    "deviceType",
    "landingPage",
    "firstSeenAt",
    "lastSeenAt",
    "createdAt",
    "updatedAt",
    "ftUtmSource",
    "ftUtmMedium",
    "ftUtmCampaign",
    "ftUtmContent",
    "ftUtmTerm",
    "ftReferrer",
    "ltUtmSource",
    "ltUtmMedium",
    "ltUtmCampaign",
    "ltUtmContent",
    "ltUtmTerm",
    "ltReferrer",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmContent",
    "utmTerm",
    "referrer",
    "lastRealtorAt"
)
SELECT
    "id",
    "tenantId",
    "projectId",
    "realtorLinkId",
    "userId",
    "ip",
    "ipHash",
    "userAgent",
    "deviceType",
    "landingPage",
    "firstSeenAt",
    "lastSeenAt",
    "createdAt",
    "updatedAt",
    "ftUtmSource",
    "ftUtmMedium",
    "ftUtmCampaign",
    "ftUtmContent",
    "ftUtmTerm",
    "ftReferrer",
    "ltUtmSource",
    "ltUtmMedium",
    "ltUtmCampaign",
    "ltUtmContent",
    "ltUtmTerm",
    "ltReferrer",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmContent",
    "utmTerm",
    "referrer",
    "lastRealtorAt"
FROM "TrackingSession";

UPDATE "TrackingSession"
SET "visitorId" = "id"
WHERE "visitorId" IS NULL;

UPDATE "Lead"
SET "visitorId" = "sessionId"
WHERE "sessionId" IS NOT NULL AND "visitorId" IS NULL;

CREATE INDEX "TrackingVisitor_tenantId_projectId_idx" ON "TrackingVisitor"("tenantId", "projectId");
CREATE INDEX "TrackingVisitor_projectId_lastSeenAt_idx" ON "TrackingVisitor"("projectId", "lastSeenAt");
CREATE INDEX "TrackingVisitor_tenantId_createdAt_idx" ON "TrackingVisitor"("tenantId", "createdAt");
CREATE INDEX "TrackingVisitor_realtorLinkId_idx" ON "TrackingVisitor"("realtorLinkId");
CREATE INDEX "TrackingSession_visitorId_idx" ON "TrackingSession"("visitorId");
CREATE INDEX "Lead_visitorId_idx" ON "Lead"("visitorId");

ALTER TABLE "TrackingVisitor"
ADD CONSTRAINT "TrackingVisitor_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrackingVisitor"
ADD CONSTRAINT "TrackingVisitor_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrackingVisitor"
ADD CONSTRAINT "TrackingVisitor_realtorLinkId_fkey"
FOREIGN KEY ("realtorLinkId") REFERENCES "RealtorLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrackingSession"
ADD CONSTRAINT "TrackingSession_visitorId_fkey"
FOREIGN KEY ("visitorId") REFERENCES "TrackingVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_visitorId_fkey"
FOREIGN KEY ("visitorId") REFERENCES "TrackingVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
