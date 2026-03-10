-- Add per-project sales motion configuration for public social-proof notices
ALTER TABLE "Project"
ADD COLUMN "salesMotionConfig" JSONB;