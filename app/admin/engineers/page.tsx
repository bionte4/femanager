import { Suspense } from "react";
import { getEngineers } from "@/app/actions/engineers";
import { EngineersTable } from "@/components/admin/engineers-table";
import {
  Pagination,
  SearchFilterBar,
} from "@/components/admin/search-filter-bar";
import { TableSkeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { ENGINEERS_WRITE_ROLES, hasRole } from "@/lib/rbac-constants";

type PageProps = {
  searchParams:
    | Promise<{ q?: string; status?: string; engagement?: string; page?: string }>
    | { q?: string; status?: string; engagement?: string; page?: string };
};

export default async function EngineersPage({ searchParams }: PageProps) {
  const session = await auth();
  const canWrite = hasRole(session?.user?.role, ENGINEERS_WRITE_ROLES);
  const params = await Promise.resolve(searchParams);
  const page = Number(params.page ?? "1") || 1;
  const data = await getEngineers({
    q: params.q,
    status: params.status,
    engagement: params.engagement,
    page,
    pageSize: 10,
  });

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Engineers</h1>
        <p className="text-xs text-muted-foreground">
          Field engineer Mitra (komisi) dan PKWT (payroll) — filter tipe
          engagement di bawah.
          {!canWrite && " Mode baca saja."}
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={3} cols={4} />}>
        <SearchFilterBar
          showStatus
          showEngagement
          placeholder="Cari nama, HP, atau kota..."
          statusOptions={[
            { value: "AVAILABLE", label: "Available" },
            { value: "BUSY", label: "Busy" },
            { value: "OFFLINE", label: "Offline" },
          ]}
          engagementOptions={[
            { value: "MITRA", label: "Mitra" },
            { value: "PKWT_OUTTASK", label: "PKWT Outtask" },
            { value: "PKWT_INTERNAL", label: "PKWT Internal" },
          ]}
        />
      </Suspense>

      <EngineersTable items={data.items} canWrite={canWrite} />

      <Suspense fallback={null}>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
        />
      </Suspense>
    </div>
  );
}
