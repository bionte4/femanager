-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('EDC', 'ROUTER_SDWAN', 'SWITCH', 'ACCESS_POINT', 'SERVER');

-- AlterEnum
ALTER TYPE "DeviceType" ADD VALUE 'ROUTER_SDWAN';

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "device_category" "DeviceCategory" NOT NULL DEFAULT 'EDC',
ADD COLUMN     "sdwan_profile" JSONB;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "is_swa" TEXT,
ADD COLUMN     "sdwan_checklist" JSONB;

-- CreateTable
CREATE TABLE "skill_certifications" (
    "id" TEXT NOT NULL,
    "engineer_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'BASIC',
    "certified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certified_by" TEXT,
    "expiry_at" TIMESTAMP(3),
    "certificate_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skill_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "video_url" TEXT,
    "file_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_certifications_engineer_id_idx" ON "skill_certifications"("engineer_id");

-- CreateIndex
CREATE INDEX "skill_certifications_skill_is_active_idx" ON "skill_certifications"("skill", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_base_category_idx" ON "knowledge_base"("category");

-- CreateIndex
CREATE INDEX "devices_device_category_idx" ON "devices"("device_category");

-- AddForeignKey
ALTER TABLE "skill_certifications" ADD CONSTRAINT "skill_certifications_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
