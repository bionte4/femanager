-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'NOC_L0';
ALTER TYPE "Role" ADD VALUE 'NOC_L1';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_L1';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "escalated_by_id" TEXT,
ADD COLUMN     "escalated_to_l1_at" TIMESTAMP(3),
ADD COLUMN     "sla_paused_at" TIMESTAMP(3),
ADD COLUMN     "sla_paused_total_ms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stop_clock_reason" TEXT;

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "type" TEXT NOT NULL,
    "ticket_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_notifications_user_id_read_at_idx" ON "app_notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "app_notifications_created_at_idx" ON "app_notifications"("created_at");

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
