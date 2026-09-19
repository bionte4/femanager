import { LocationType } from "@prisma/client";
import { z } from "zod";
import { normalizeExcelHeaders } from "@/lib/excel";
import {
  SKU_ERROR,
  SKU_REGEX,
  WAREHOUSE_CODE_ERROR,
  WAREHOUSE_CODE_REGEX,
  normalizeCode,
} from "@/lib/code-conventions";

export { normalizeExcelHeaders };

export const sparepartExcelRowSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU wajib")
    .max(64)
    .transform((v) => normalizeCode(v))
    .refine((v) => SKU_REGEX.test(v), { message: SKU_ERROR }),
  name: z.string().min(1, "Nama wajib").max(120),
  stock_qty: z.coerce.number().int().min(0, "Stok >= 0"),
  location_type: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.enum(["WAREHOUSE", "ENGINEER"])),
  warehouse_code: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t ? normalizeCode(t) : null;
    })
    .refine((v) => v === null || WAREHOUSE_CODE_REGEX.test(v), {
      message: WAREHOUSE_CODE_ERROR,
    }),
  holder_phone: z.string().optional().nullable(),
});

export type SparepartExcelRow = z.infer<typeof sparepartExcelRowSchema>;

export type SparepartPreviewRow = {
  row: number;
  sku: string;
  name: string;
  stock_qty: number;
  location_type: LocationType;
  warehouse_code: string | null;
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
  "warehouse_code",
  "holder_phone",
] as const;

export const SPAREPART_SAMPLE_ROW = {
  sku: "EDC-BCA-ICT250",
  name: "EDC BCA Contoh",
  stock_qty: 5,
  location_type: "WAREHOUSE",
  warehouse_code: "HQ",
  holder_phone: "",
};
