import { LocationType } from "@prisma/client";
import { z } from "zod";

export const sparepartExcelRowSchema = z.object({
  sku: z.string().min(1, "SKU wajib").max(64),
  name: z.string().min(1, "Nama wajib").max(120),
  stock_qty: z.coerce.number().int().min(0, "Stok >= 0"),
  location_type: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.enum(["WAREHOUSE", "ENGINEER"])),
  holder_phone: z.string().optional().nullable(),
});

export type SparepartExcelRow = z.infer<typeof sparepartExcelRowSchema>;

export type SparepartPreviewRow = {
  row: number;
  sku: string;
  name: string;
  stock_qty: number;
  location_type: LocationType;
  holder_phone: string | null;
  action: "create" | "update" | "error";
  existing_id?: string;
  errors: string[];
};

export const SPAREPART_EXCEL_HEADERS = [
  "sku",
  "name",
  "stock_qty",
  "location_type",
  "holder_phone",
] as const;

export function normalizeExcelHeaders(raw: Record<string, unknown>) {
  const map: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().toLowerCase().replace(/\s+/g, "_");
    map[key] = v;
  }
  return map;
}
