"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TenantsTable } from "@/components/admin/tenants-table";
import { TenantsExcelTools } from "@/components/admin/tenants-excel-tools";
import {
  Pagination,
  SearchFilterBar,
} from "@/components/admin/search-filter-bar";
import { Button } from "@/components/ui/button";

type TenantRow = React.ComponentProps<typeof TenantsTable>["items"][number];

export function TenantsWorkspace({
  items,
  cities,
  page,
  totalPages,
  total,
}: {
  items: TenantRow[];
  cities: string[];
  page: number;
  totalPages: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const [createNonce, setCreateNonce] = useState(0);

  return (
    <div className="space-y-2">
      <SearchFilterBar
        showCity
        cities={cities}
        placeholder="Cari nama, kode, atau alamat..."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TenantsExcelTools />
            <Button
              onClick={() => {
                setCreateNonce((n) => n + 1);
                setOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Tenant
            </Button>
          </div>
        }
      />
      <TenantsTable
        items={items}
        hideAdd
        open={open}
        onOpenChange={setOpen}
        createNonce={createNonce}
      />
      <Pagination page={page} totalPages={totalPages} total={total} />
    </div>
  );
}
