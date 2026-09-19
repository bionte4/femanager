-- Multi-gudang: master warehouses + FK di spareparts

CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_code_key" ON "warehouses"("code");
CREATE INDEX IF NOT EXISTS "warehouses_city_idx" ON "warehouses"("city");

-- Gudang default untuk data existing
INSERT INTO "warehouses" ("id", "code", "name", "city", "address", "is_active", "created_at", "updated_at")
SELECT 'wh_default_hq', 'HQ', 'Gudang Pusat', 'Jakarta', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "warehouses" WHERE "code" = 'HQ');

ALTER TABLE "spareparts" ADD COLUMN IF NOT EXISTS "warehouse_id" TEXT;

-- Backfill stok warehouse ke Gudang Pusat
UPDATE "spareparts"
SET "warehouse_id" = (SELECT "id" FROM "warehouses" WHERE "code" = 'HQ' LIMIT 1)
WHERE "location_type" = 'WAREHOUSE' AND "warehouse_id" IS NULL;

-- Hapus unique global SKU (jika ada)
ALTER TABLE "spareparts" DROP CONSTRAINT IF EXISTS "spareparts_sku_key";
DROP INDEX IF EXISTS "spareparts_sku_key";

CREATE INDEX IF NOT EXISTS "spareparts_warehouse_id_idx" ON "spareparts"("warehouse_id");
CREATE INDEX IF NOT EXISTS "spareparts_sku_idx" ON "spareparts"("sku");

-- Unik per gudang / per engineer
CREATE UNIQUE INDEX IF NOT EXISTS "spareparts_sku_warehouse_uidx"
  ON "spareparts" ("sku", "warehouse_id")
  WHERE "location_type" = 'WAREHOUSE' AND "warehouse_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "spareparts_sku_holder_uidx"
  ON "spareparts" ("sku", "holder_id")
  WHERE "location_type" = 'ENGINEER' AND "holder_id" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spareparts_warehouse_id_fkey'
  ) THEN
    ALTER TABLE "spareparts"
      ADD CONSTRAINT "spareparts_warehouse_id_fkey"
      FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
