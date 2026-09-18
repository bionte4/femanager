import { Suspense } from "react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getPhaseSummary,
  getReportFilterOptions,
  getReportRows,
} from "@/lib/reports";
import { ReportsClient } from "@/components/admin/reports-client";

type SearchParams = {
  from?: string;
  to?: string;
  city?: string;
  engineer_id?: string;
  sla_tier?: string;
  tenant_id?: string;
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const filters = {
    from: searchParams.from ?? "",
    to: searchParams.to ?? "",
    city: searchParams.city ?? "",
    engineer_id: searchParams.engineer_id ?? "",
    sla_tier: searchParams.sla_tier ?? "",
    tenant_id: searchParams.tenant_id ?? "",
  };

  const reportFilters = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    city: filters.city || undefined,
    engineer_id: filters.engineer_id || undefined,
    sla_tier: filters.sla_tier || undefined,
    tenant_id: filters.tenant_id || undefined,
  };

  const [rows, options] = await Promise.all([
    getReportRows(reportFilters),
    getReportFilterOptions(),
  ]);

  const phaseSummary = getPhaseSummary(rows);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
        <p className="text-xs text-muted-foreground">
          SLA by phase, Excel, PDF customer, dan pause leakage audit.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat laporan...</p>}>
        <ReportsClient
          rows={rows}
          options={options}
          filters={filters}
          phaseSummary={phaseSummary}
        />
      </Suspense>
    </div>
  );
}
