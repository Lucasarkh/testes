-- CreateEnum
CREATE TYPE "PreLaunchCaptureMode" AS ENUM ('QUEUE', 'RESERVATION');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "preLaunchCaptureMode" "PreLaunchCaptureMode" NOT NULL DEFAULT 'QUEUE';
