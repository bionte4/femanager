-- CreateEnum
CREATE TYPE "FraudType" AS ENUM ('FAKE_GPS', 'PHOTO_DUPLICATE', 'FAST_CHECKIN', 'LOCATION_JUMP', 'PHOTO_GPS_MISMATCH', 'TIME_ANOMALY');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "ticket_logs" ADD COLUMN     "exif_lat" DOUBLE PRECISION,
ADD COLUMN     "exif_lng" DOUBLE PRECISION,
ADD COLUMN     "exif_timestamp" TIMESTAMP(3),
ADD COLUMN     "photo_hash" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspended_reason" TEXT,
ADD COLUMN     "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 100.0;

-- CreateTable
CREATE TABLE "engineer_ratings" (
    "id" TEXT NOT NULL,
    "engineer_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "tenant_rating" INTEGER,
    "tenant_comment" TEXT,
    "system_score" DOUBLE PRECISION NOT NULL,
    "fraud_flags" TEXT[],
    "is_fraud" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engineer_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_logs" (
    "id" TEXT NOT NULL,
    "engineer_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "type" "FraudType" NOT NULL,
    "severity" "FraudSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "engineer_id" TEXT NOT NULL,
    "total_tickets" INTEGER NOT NULL,
    "sla_meet_rate" DOUBLE PRECISION NOT NULL,
    "avg_resolve_minutes" DOUBLE PRECISION NOT NULL,
    "total_earnings" INTEGER NOT NULL,
    "fraud_count" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "engineer_ratings_ticket_id_key" ON "engineer_ratings"("ticket_id");

-- CreateIndex
CREATE INDEX "engineer_ratings_engineer_id_idx" ON "engineer_ratings"("engineer_id");

-- CreateIndex
CREATE INDEX "fraud_logs_engineer_id_idx" ON "fraud_logs"("engineer_id");

-- CreateIndex
CREATE INDEX "fraud_logs_ticket_id_idx" ON "fraud_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "fraud_logs_severity_idx" ON "fraud_logs"("severity");

-- CreateIndex
CREATE INDEX "fraud_logs_created_at_idx" ON "fraud_logs"("created_at");

-- CreateIndex
CREATE INDEX "leaderboard_snapshots_period_rank_idx" ON "leaderboard_snapshots"("period", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_snapshots_period_engineer_id_key" ON "leaderboard_snapshots"("period", "engineer_id");

-- CreateIndex
CREATE INDEX "ticket_logs_photo_hash_idx" ON "ticket_logs"("photo_hash");

-- AddForeignKey
ALTER TABLE "engineer_ratings" ADD CONSTRAINT "engineer_ratings_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineer_ratings" ADD CONSTRAINT "engineer_ratings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_logs" ADD CONSTRAINT "fraud_logs_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_logs" ADD CONSTRAINT "fraud_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_engineer_id_fkey" FOREIGN KEY ("engineer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
