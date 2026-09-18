-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_tickets" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "external_ticket_id" TEXT NOT NULL,
    "internal_ticket_id" TEXT NOT NULL,
    "last_payload" JSONB,
    "last_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integrations_api_key_key" ON "integrations"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "external_tickets_internal_ticket_id_key" ON "external_tickets"("internal_ticket_id");

-- CreateIndex
CREATE INDEX "external_tickets_integration_id_idx" ON "external_tickets"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_tickets_integration_id_external_ticket_id_key" ON "external_tickets"("integration_id", "external_ticket_id");

-- AddForeignKey
ALTER TABLE "external_tickets" ADD CONSTRAINT "external_tickets_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_tickets" ADD CONSTRAINT "external_tickets_internal_ticket_id_fkey" FOREIGN KEY ("internal_ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
