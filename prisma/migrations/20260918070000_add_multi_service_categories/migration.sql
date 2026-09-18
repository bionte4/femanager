-- Service categories & packages
CREATE TABLE IF NOT EXISTS "service_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "base_fee_tier1" INTEGER NOT NULL,
    "base_fee_tier2" INTEGER NOT NULL,
    "base_fee_tier3" INTEGER NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "requires_certification" BOOLEAN NOT NULL DEFAULT false,
    "checklist_template" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "service_categories_code_key" ON "service_categories"("code");

CREATE TABLE IF NOT EXISTS "service_packages" (
    "id" TEXT NOT NULL,
    "service_category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_customer" INTEGER NOT NULL,
    "fee_engineer" INTEGER NOT NULL,
    "estimated_duration" INTEGER NOT NULL DEFAULT 60,
    "checklist_template" JSONB,
    "required_engineers" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "service_packages_service_category_id_idx" ON "service_packages"("service_category_id");
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Users: skills Skill[] -> TEXT[], add toolkit flags
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "skills_text" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "users" SET "skills_text" = COALESCE(
  (SELECT array_agg(s::text) FROM unnest("skills") AS s),
  ARRAY[]::TEXT[]
) WHERE "skills_text" IS NULL OR cardinality("skills_text") = 0;
ALTER TABLE "users" DROP COLUMN IF EXISTS "skills";
ALTER TABLE "users" RENAME COLUMN "skills_text" TO "skills";
ALTER TABLE "users" ALTER COLUMN "skills" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ALTER COLUMN "skills" SET NOT NULL;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_motorcycle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_toolkit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_car" BOOLEAN NOT NULL DEFAULT false;

-- Devices
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "service_category_id" TEXT;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "model" TEXT;
CREATE INDEX IF NOT EXISTS "devices_service_category_id_idx" ON "devices"("service_category_id");
DO $$ BEGIN
  ALTER TABLE "devices" ADD CONSTRAINT "devices_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "service_category_id" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "service_package_id" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "required_engineers" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'ADMIN';
CREATE INDEX IF NOT EXISTS "tickets_service_category_id_idx" ON "tickets"("service_category_id");
DO $$ BEGIN
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "tickets" ADD CONSTRAINT "tickets_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Commission rules
ALTER TABLE "commission_rules" ADD COLUMN IF NOT EXISTS "service_category_id" TEXT;
CREATE INDEX IF NOT EXISTS "commission_rules_service_category_id_idx" ON "commission_rules"("service_category_id");
DO $$ BEGIN
  ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Candidates extras
ALTER TABLE "engineer_candidates" ADD COLUMN IF NOT EXISTS "has_car" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "engineer_candidates" ADD COLUMN IF NOT EXISTS "has_ladder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "engineer_candidates" ADD COLUMN IF NOT EXISTS "has_drill" BOOLEAN NOT NULL DEFAULT false;
