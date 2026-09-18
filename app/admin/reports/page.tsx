import { Suspense } from "react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReportFilterOptions, getReportRows } from "@/lib/reports";
import { ReportsClient } from "@/components/admin/reports-client";

type SearchParams = {
  from?: string;
  to?: string;
  city?: string;
  engineer_id?: string;
  sla_tier?: string;
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
  };

  const [rows, options] = await Promise.all([
    getReportRows({
      from: filters.from || undefined,
      to: filters.to || undefined,
      city: filters.city || undefined,
      engineer_id: filters.engineer_id || undefined,
      sla_tier: filters.sla_tier || undefined,
    }),
    getReportFilterOptions(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
        <p className="text-xs text-muted-foreground">
          Laporan SLA & performa — filter lalu export Excel untuk klien.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat laporan...</p>}>
        <ReportsClient rows={rows} options={options} filters={filters} />
      </Suspense>
    </div>
  );
}
