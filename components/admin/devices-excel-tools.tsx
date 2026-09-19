"use client";

import {
  commitDevicesImport,
  getDevicesForExport,
  previewDevicesImport,
} from "@/app/actions/devices";
import { MasterExcelTools } from "@/components/admin/master-excel-tools";
import {
  DEVICE_EXCEL_HEADERS,
  DEVICE_SAMPLE_ROW,
  type DevicePreviewRow,
} from "@/lib/validations/device-excel";

export function DevicesExcelTools() {
  return (
    <MasterExcelTools<DevicePreviewRow>
      entityLabel="Devices"
      sheetName="devices"
      filePrefix="devices"
      headers={DEVICE_EXCEL_HEADERS}
      sampleRow={DEVICE_SAMPLE_ROW}
      previewColumns={[
        {
          key: "serial_number",
          label: "Serial",
          className: "font-mono text-xs",
        },
        { key: "tenant_code", label: "Tenant", className: "font-mono text-xs" },
        { key: "type", label: "Type", className: "text-xs" },
        { key: "status", label: "Status", className: "text-xs" },
      ]}
      getExportRows={getDevicesForExport}
      previewImport={previewDevicesImport}
      commitImport={commitDevicesImport}
    />
  );
}
