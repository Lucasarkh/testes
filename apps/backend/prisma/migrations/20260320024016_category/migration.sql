-- AlterTable
ALTER TABLE "LotDetails" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "LotCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LotCategory_tenantId_projectId_sortOrder_idx" ON "LotCategory"("tenantId", "projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LotCategory_projectId_slug_key" ON "LotCategory"("projectId", "slug");

-- CreateIndex
CREATE INDEX "LotDetails_categoryId_idx" ON "LotDetails"("categoryId");

-- AddForeignKey
ALTER TABLE "LotCategory" ADD CONSTRAINT "LotCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotCategory" ADD CONSTRAINT "LotCategory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotDetails" ADD CONSTRAINT "LotDetails_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LotCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
