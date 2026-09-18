-- Sprint D2: EngineerContract + EngagementChangeLog

CREATE TYPE "EngineerContractType" AS ENUM ('PKWT_OUTTASK', 'PKWT_INTERNAL');
CREATE TYPE "EngineerContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ENDED', 'EXPIRED');

CREATE TABLE "engineer_contracts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "EngineerContractType" NOT NULL,
    "status" "EngineerContractStatus" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "client_label" TEXT,
    "placement_cities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "placement_tenant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_url" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineer_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "engagement_change_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_type" "EngagementType" NOT NULL,
    "to_type" "EngagementType" NOT NULL,
    "reason" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_change_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "engineer_contracts_user_id_status_idx" ON "engineer_contracts"("user_id", "status");
CREATE INDEX "engineer_contracts_end_at_idx" ON "engineer_contracts"("end_at");
CREATE INDEX "engineer_contracts_status_end_at_idx" ON "engineer_contracts"("status", "end_at");
CREATE INDEX "engagement_change_logs_user_id_created_at_idx" ON "engagement_change_logs"("user_id", "created_at");

ALTER TABLE "engineer_contracts" ADD CONSTRAINT "engineer_contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "engagement_change_logs" ADD CONSTRAINT "engagement_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
