-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEAD_AUTO_DISTRIBUTED';

-- CreateTable
CREATE TABLE "LeadDistributionConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastAssignedIndex" INTEGER NOT NULL DEFAULT -1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadDistributionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadDistributionLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "realtorLinkId" TEXT NOT NULL,
    "queuePosition" INTEGER NOT NULL,
    "queueSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadDistributionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadDistributionConfig_projectId_key" ON "LeadDistributionConfig"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDistributionLog_leadId_key" ON "LeadDistributionLog"("leadId");

-- CreateIndex
CREATE INDEX "LeadDistributionLog_projectId_createdAt_idx" ON "LeadDistributionLog"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LeadDistributionLog_realtorLinkId_idx" ON "LeadDistributionLog"("realtorLinkId");

-- AddForeignKey
ALTER TABLE "LeadDistributionConfig" ADD CONSTRAINT "LeadDistributionConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDistributionLog" ADD CONSTRAINT "LeadDistributionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDistributionLog" ADD CONSTRAINT "LeadDistributionLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDistributionLog" ADD CONSTRAINT "LeadDistributionLog_realtorLinkId_fkey" FOREIGN KEY ("realtorLinkId") REFERENCES "RealtorLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
