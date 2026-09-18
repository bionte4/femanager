-- Sprint D1: engagement_type Mitra vs PKWT (foundation)

CREATE TYPE "EngagementType" AS ENUM ('MITRA', 'PKWT_OUTTASK', 'PKWT_INTERNAL');
CREATE TYPE "EmploymentStatus" AS ENUM ('NONE', 'ACTIVE', 'SUSPENDED', 'ENDED');

ALTER TABLE "users"
  ADD COLUMN "engagement_type" "EngagementType" NOT NULL DEFAULT 'MITRA',
  ADD COLUMN "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "employer_name" TEXT,
  ADD COLUMN "employee_no" TEXT;
