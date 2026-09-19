"use client";

import {
  commitCategoriesImport,
  getCategoriesForExport,
  previewCategoriesImport,
} from "@/app/actions/service-categories";
import { MasterExcelTools } from "@/components/admin/master-excel-tools";
import {
  CATEGORY_EXCEL_HEADERS,
  CATEGORY_SAMPLE_ROW,
  type CategoryPreviewRow,
} from "@/lib/validations/category-excel";

export function CategoriesExcelTools() {
  return (
    <MasterExcelTools<CategoryPreviewRow>
      entityLabel="Kategori"
      sheetName="categories"
      filePrefix="service-categories"
      headers={CATEGORY_EXCEL_HEADERS}
      sampleRow={CATEGORY_SAMPLE_ROW}
      previewColumns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Nama" },
        { key: "base_fee_tier1", label: "Fee T1", className: "text-xs" },
      ]}
      getExportRows={getCategoriesForExport}
      previewImport={previewCategoriesImport}
      commitImport={commitCategoriesImport}
    />
  );
}
