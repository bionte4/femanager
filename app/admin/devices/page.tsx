import { Suspense } from "react";
import { getDevices } from "@/app/actions/devices";
import { getTenantOptions } from "@/app/actions/tenants";
import { DevicesTable } from "@/components/admin/devices-table";
import { DevicesExcelTools } from "@/components/admin/devices-excel-tools";
import {
  Pagination,
  SearchFilterBar,
} from "@/components/admin/search-filter-bar";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }> | {
    q?: string;
    page?: string;
  };
};

export default async function DevicesPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams);
  const page = Number(params.page ?? "1") || 1;
  const [data, tenants] = await Promise.all([
    getDevices({ q: params.q, page, pageSize: 10 }),
    getTenantOptions(),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Devices</h1>
          <p className="text-xs text-muted-foreground">
            Perangkat EDC / Router / Switch. Bulk via Excel dengan preview.
          </p>
        </div>
        <DevicesExcelTools />
      </div>

      <Suspense fallback={null}>
        <SearchFilterBar placeholder="Cari serial, brand, tenant, IP..." />
      </Suspense>

      <DevicesTable items={data.items} tenants={tenants} />

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
