-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('NEW', 'SCREENING', 'TRAINING', 'TRIAL', 'APPROVED', 'REJECTED', 'BLACKLISTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_coordinator" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "engineer_candidates" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "nik" TEXT,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "education" TEXT NOT NULL,
    "school_name" TEXT,
    "has_motorcycle" BOOLEAN NOT NULL DEFAULT false,
    "has_toolkit" BOOLEAN NOT NULL DEFAULT false,
    "has_laptop" BOOLEAN NOT NULL DEFAULT false,
    "skills" TEXT[],
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "previous_vendor" TEXT,
    "bank_name" TEXT,
    "bank_account_no" TEXT,
    "bank_account_name" TEXT,
    "id_card_photo_url" TEXT,
    "selfie_photo_url" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'NEW',
    "screening_score" INTEGER,
    "training_score" INTEGER,
    "training_certificate_url" TEXT,
    "trial_tickets_completed" INTEGER NOT NULL DEFAULT 0,
    "trust_score_initial" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "assigned_coordinator_id" TEXT,
    "notes" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineer_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "engineer_candidates_phone_key" ON "engineer_candidates"("phone");

-- CreateIndex
CREATE INDEX "engineer_candidates_status_idx" ON "engineer_candidates"("status");

-- CreateIndex
CREATE INDEX "engineer_candidates_province_city_idx" ON "engineer_candidates"("province", "city");

-- CreateIndex
CREATE INDEX "engineer_candidates_assigned_coordinator_id_idx" ON "engineer_candidates"("assigned_coordinator_id");

-- CreateIndex
CREATE INDEX "engineer_candidates_created_at_idx" ON "engineer_candidates"("created_at");

-- AddForeignKey
ALTER TABLE "engineer_candidates" ADD CONSTRAINT "engineer_candidates_assigned_coordinator_id_fkey" FOREIGN KEY ("assigned_coordinator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
