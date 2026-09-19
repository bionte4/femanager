"use client";

import {
  commitTenantsImport,
  getTenantsForExport,
  previewTenantsImport,
} from "@/app/actions/tenants";
import { MasterExcelTools } from "@/components/admin/master-excel-tools";
import {
  TENANT_EXCEL_HEADERS,
  TENANT_SAMPLE_ROW,
  type TenantPreviewRow,
} from "@/lib/validations/tenant-excel";

export function TenantsExcelTools() {
  return (
    <MasterExcelTools<TenantPreviewRow>
      entityLabel="Tenants"
      sheetName="tenants"
      filePrefix="tenants"
      headers={TENANT_EXCEL_HEADERS}
      sampleRow={TENANT_SAMPLE_ROW}
      previewColumns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Nama" },
        { key: "city", label: "Kota" },
        { key: "sla_tier", label: "SLA", className: "text-xs" },
      ]}
      getExportRows={getTenantsForExport}
      previewImport={previewTenantsImport}
      commitImport={commitTenantsImport}
    />
  );
}
