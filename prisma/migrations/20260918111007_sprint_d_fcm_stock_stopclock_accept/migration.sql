-- CreateEnum
CREATE TYPE "SparepartMutationType" AS ENUM ('IN', 'OUT', 'ADJUST');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "stop_clock_approval_status" TEXT,
ADD COLUMN     "stop_clock_approved_at" TIMESTAMP(3),
ADD COLUMN     "stop_clock_approved_by" TEXT,
ADD COLUMN     "stop_clock_requested_at" TIMESTAMP(3),
ADD COLUMN     "stop_clock_requested_by" TEXT;

-- CreateTable
CREATE TABLE "sparepart_mutations" (
    "id" TEXT NOT NULL,
    "sparepart_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "user_id" TEXT,
    "type" "SparepartMutationType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sparepart_mutations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "user_agent" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sparepart_mutations_sparepart_id_created_at_idx" ON "sparepart_mutations"("sparepart_id", "created_at");

-- CreateIndex
CREATE INDEX "sparepart_mutations_ticket_id_idx" ON "sparepart_mutations"("ticket_id");

-- CreateIndex
CREATE INDEX "sparepart_mutations_created_at_idx" ON "sparepart_mutations"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_device_tokens_token_key" ON "push_device_tokens"("token");

-- CreateIndex
CREATE INDEX "push_device_tokens_user_id_idx" ON "push_device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "tickets_stop_clock_approval_status_idx" ON "tickets"("stop_clock_approval_status");

-- AddForeignKey
ALTER TABLE "sparepart_mutations" ADD CONSTRAINT "sparepart_mutations_sparepart_id_fkey" FOREIGN KEY ("sparepart_id") REFERENCES "spareparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_mutations" ADD CONSTRAINT "sparepart_mutations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparepart_mutations" ADD CONSTRAINT "sparepart_mutations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_device_tokens" ADD CONSTRAINT "push_device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
