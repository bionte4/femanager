-- Time Tracker summary + seed default Workload Guard settings

CREATE TABLE IF NOT EXISTS "ticket_time_summaries" (
    "ticket_id" TEXT NOT NULL,
    "engineer_id" TEXT,
    "queue_ms" INTEGER NOT NULL DEFAULT 0,
    "travel_ms" INTEGER NOT NULL DEFAULT 0,
    "onsite_ms" INTEGER NOT NULL DEFAULT 0,
    "repair_ms" INTEGER NOT NULL DEFAULT 0,
    "pause_ms" INTEGER NOT NULL DEFAULT 0,
    "active_ms" INTEGER NOT NULL DEFAULT 0,
    "total_ms" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_time_summaries_pkey" PRIMARY KEY ("ticket_id")
);

CREATE INDEX IF NOT EXISTS "ticket_time_summaries_engineer_id_idx"
  ON "ticket_time_summaries"("engineer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_time_summaries_ticket_id_fkey'
  ) THEN
    ALTER TABLE "ticket_time_summaries"
      ADD CONSTRAINT "ticket_time_summaries_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Default Workload Guard di AppSetting (boleh diubah via UI)
INSERT INTO "app_settings" ("key", "value", "updated_at")
SELECT
  'ops.workload',
  '{"enabled":true,"max_active_tickets":2,"max_load_minutes":240,"warn_load_minutes":180}'::jsonb,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "app_settings" WHERE "key" = 'ops.workload');
