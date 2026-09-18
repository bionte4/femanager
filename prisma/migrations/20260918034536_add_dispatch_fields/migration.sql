-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_assigned_at" TIMESTAMP(3),
ADD COLUMN     "tried_engineer_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "tickets_status_last_assigned_at_idx" ON "tickets"("status", "last_assigned_at");
