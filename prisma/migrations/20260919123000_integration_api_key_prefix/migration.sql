-- Integration API keys: prefix + hash only (hapus plain setelah backfill)

ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "api_key_prefix" TEXT;
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "api_key_last4" TEXT NOT NULL DEFAULT '';

-- Izinkan api_key NULL (legacy / cleared)
ALTER TABLE "integrations" ALTER COLUMN "api_key" DROP NOT NULL;

-- Backfill dari plain key lama
UPDATE "integrations"
SET
  "api_key_prefix" = LEFT("api_key", 12),
  "api_key_last4" = RIGHT("api_key", 4)
WHERE "api_key" IS NOT NULL
  AND length("api_key") >= 4
  AND ("api_key_prefix" IS NULL OR "api_key_prefix" = '');

-- Fallback jika ada baris rusak
UPDATE "integrations"
SET "api_key_prefix" = 'invalid______'
WHERE "api_key_prefix" IS NULL OR "api_key_prefix" = '';

ALTER TABLE "integrations" ALTER COLUMN "api_key_prefix" SET NOT NULL;

-- Hapus plain text at-rest
UPDATE "integrations" SET "api_key" = NULL;

CREATE INDEX IF NOT EXISTS "integrations_api_key_prefix_idx" ON "integrations"("api_key_prefix");
