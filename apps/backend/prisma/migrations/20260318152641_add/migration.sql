-- CreateEnum
CREATE TYPE "PreLaunchQueueStatus" AS ENUM ('ACTIVE', 'CONTACTED', 'CONVERTED', 'REMOVED');

-- CreateTable
CREATE TABLE "PreLaunchQueueEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mapElementId" TEXT,
    "leadId" TEXT NOT NULL,
    "realtorLinkId" TEXT,
    "position" INTEGER NOT NULL,
    "status" "PreLaunchQueueStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreLaunchQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreLaunchQueueEntry_leadId_key" ON "PreLaunchQueueEntry"("leadId");

-- CreateIndex
CREATE INDEX "PreLaunchQueueEntry_tenantId_projectId_status_createdAt_idx" ON "PreLaunchQueueEntry"("tenantId", "projectId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PreLaunchQueueEntry_projectId_mapElementId_status_position_idx" ON "PreLaunchQueueEntry"("projectId", "mapElementId", "status", "position");

-- CreateIndex
CREATE INDEX "PreLaunchQueueEntry_realtorLinkId_status_idx" ON "PreLaunchQueueEntry"("realtorLinkId", "status");

-- AddForeignKey
ALTER TABLE "PreLaunchQueueEntry" ADD CONSTRAINT "PreLaunchQueueEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaunchQueueEntry" ADD CONSTRAINT "PreLaunchQueueEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaunchQueueEntry" ADD CONSTRAINT "PreLaunchQueueEntry_mapElementId_fkey" FOREIGN KEY ("mapElementId") REFERENCES "MapElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaunchQueueEntry" ADD CONSTRAINT "PreLaunchQueueEntry_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaunchQueueEntry" ADD CONSTRAINT "PreLaunchQueueEntry_realtorLinkId_fkey" FOREIGN KEY ("realtorLinkId") REFERENCES "RealtorLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
