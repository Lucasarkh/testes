-- Add responsive banner URLs by device (desktop/tablet/mobile)
ALTER TABLE "Project"
ADD COLUMN "bannerImageTabletUrl" TEXT,
ADD COLUMN "bannerImageMobileUrl" TEXT;
