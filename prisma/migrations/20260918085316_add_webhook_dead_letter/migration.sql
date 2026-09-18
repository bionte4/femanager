-- CreateTable
CREATE TABLE "webhook_dead_letters" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "external_ticket_id" TEXT,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_http_status" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "next_retry_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "webhook_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_dead_letters_status_next_retry_at_idx" ON "webhook_dead_letters"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "webhook_dead_letters_integration_id_idx" ON "webhook_dead_letters"("integration_id");

-- CreateIndex
CREATE INDEX "webhook_dead_letters_created_at_idx" ON "webhook_dead_letters"("created_at");

-- AddForeignKey
ALTER TABLE "webhook_dead_letters" ADD CONSTRAINT "webhook_dead_letters_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
