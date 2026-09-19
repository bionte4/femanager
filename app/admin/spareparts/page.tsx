import { Suspense } from "react";
import Link from "next/link";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSpareparts } from "@/app/actions/spareparts";
import { SparepartsTable } from "@/components/admin/spareparts-table";
import { SparepartsExcelTools } from "@/components/admin/spareparts-excel-tools";
import { SearchFilterBar } from "@/components/admin/search-filter-bar";
import { TableSkeleton } from "@/components/ui/skeleton";

type SearchParams = {
  q?: string;
  status?: string;
  page?: string;
};

export default async function AdminSparepartsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (
    !session?.user ||
    !(ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    redirect("/login");
  }

  const page = Number(searchParams.page ?? "1") || 1;
  const [data, engineers, warehouses] = await Promise.all([
    getSpareparts({
      q: searchParams.q,
      location_type: searchParams.status,
      page,
    }),
    prisma.user.findMany({
      where: { role: Role.FIELD_ENGINEER },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true, city: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Spareparts</h1>
          <p className="text-xs text-muted-foreground">
            Inventory multi-gudang & di engineer. Kelola gudang di{" "}
            <Link href="/admin/warehouses" className="text-sky-700 underline">
              Gudang
            </Link>
            . Bulk via Excel dengan preview.
          </p>
        </div>
        <SparepartsExcelTools />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <SearchFilterBar
          placeholder="Cari nama / SKU..."
          showStatus
          statusOptions={[
            { value: "WAREHOUSE", label: "Warehouse" },
            { value: "ENGINEER", label: "Engineer" },
          ]}
        />
        <SparepartsTable
          items={data.items}
          engineers={engineers}
          warehouses={warehouses}
        />
        {data.totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Halaman {data.page} / {data.totalPages} · {data.total} item
          </p>
        )}
      </Suspense>
    </div>
  );
}
