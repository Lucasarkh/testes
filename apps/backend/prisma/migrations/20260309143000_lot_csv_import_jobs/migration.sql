-- CreateEnum
CREATE TYPE "LotImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateTable
CREATE TABLE "LotImportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT,
    "fileName" TEXT NOT NULL,
    "status" "LotImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotImportError" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "code" TEXT,
    "message" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotImportError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LotImportJob_tenantId_projectId_createdAt_idx" ON "LotImportJob"("tenantId", "projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LotImportError_importId_line_idx" ON "LotImportError"("importId", "line");

-- AddForeignKey
ALTER TABLE "LotImportError" ADD CONSTRAINT "LotImportError_importId_fkey" FOREIGN KEY ("importId") REFERENCES "LotImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
