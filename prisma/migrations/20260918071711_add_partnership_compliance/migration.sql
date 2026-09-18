-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('PENDING', 'SIGNED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('JOB_ACCEPT', 'JOB_REJECT', 'JOB_TIMEOUT', 'LOGIN', 'LOGOUT', 'TOOL_CHECK', 'AGREEMENT_SIGNED');

-- CreateEnum
CREATE TYPE "PartnershipStatus" AS ENUM ('NOT_SIGNED', 'SIGNED', 'EXPIRED');

-- AlterTable
ALTER TABLE "devices" ALTER COLUMN "type" SET DEFAULT 'EDC_BCA';

-- AlterTable
ALTER TABLE "service_categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_packages" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "rejected_by" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_work_for_others" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "partnership_status" "PartnershipStatus" NOT NULL DEFAULT 'NOT_SIGNED',
ADD COLUMN     "tools_owned" JSONB;

-- CreateTable
CREATE TABLE "partnership_agreements" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Perjanjian Kemitraan Mitra Teknisi FE-Track',
    "content_html" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "partnership_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineer_agreements" (
    "id" TEXT NOT NULL,
    "engineer_id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'PENDING',
    "signed_at" TIMESTAMP(3),
    "signature_data" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "id_card_verified" BOOLEAN NOT NULL DEFAULT false,
    "consent_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engineer_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_logs" (
    "id" TEXT NOT NULL,
    "engineer_id" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "ticket_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engineer_agreements_status_idx" ON "engineer_agreements"("status");

-- CreateIndex
CREATE INDEX "engineer_agreements_engineer_id_idx" ON "engineer_agreements"("engineer_id");

-- CreateIndex
CREATE UNIQUE INDEX "engineer_agreements_engineer_id_agreement_id_key" ON "engineer_agreements"("engineer_id", "agreement_id");

-- CreateIndex
CREATE INDEX "compliance_logs_engineer_id_idx" ON "compliance_logs"("engineer_id");

-- CreateIndex
CREATE INDEX "compliance_logs_type_idx" ON "compliance_logs"("type");

-- CreateIndex
CREATE INDEX "compliance_logs_created_at_idx" ON "compliance_logs"("created_at");

-- AddForeignKey
ALTER TABLE "engineer_agreements" ADD CONSTRAINT "engineer_agreements_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineer_agreements" ADD CONSTRAINT "engineer_agreements_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "partnership_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_logs" ADD CONSTRAINT "compliance_logs_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
