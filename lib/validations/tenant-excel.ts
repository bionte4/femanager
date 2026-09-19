import { z } from "zod";
import type { ExcelPreviewAction } from "@/lib/excel";

export const TENANT_EXCEL_HEADERS = [
  "code",
  "name",
  "address",
  "province",
  "city",
  "district",
  "sub_district",
  "lat",
  "lng",
  "pic_name",
  "pic_phone",
  "sla_tier",
  "is_active",
] as const;

export const tenantExcelRowSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => /^[A-Z0-9-]+$/.test(v), "Kode hanya A-Z, 0-9, -"),
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  province: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  sub_district: z.string().max(100).optional().nullable(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  pic_name: z.string().max(120).optional().nullable(),
  pic_phone: z.string().max(20).optional().nullable(),
  sla_tier: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z.enum(["TIER1_JABODETABEK", "TIER2_PROVINCE", "TIER3_KABUPATEN"])
    ),
  is_active: z.boolean().default(true),
});

export type TenantExcelRow = z.infer<typeof tenantExcelRowSchema>;

export type TenantPreviewRow = {
  row: number;
  code: string;
  name: string;
  city: string;
  sla_tier: string;
  action: ExcelPreviewAction;
  existing_id?: string;
  payload?: TenantExcelRow;
  errors: string[];
};

export const TENANT_SAMPLE_ROW = {
  code: "DEMO-JKTS99",
  name: "Toko Contoh Excel",
  address: "Jl. Contoh No. 1",
  province: "DKI Jakarta",
  city: "Jakarta Pusat",
  district: "Menteng",
  sub_district: "",
  lat: -6.1944,
  lng: 106.8229,
  pic_name: "Budi",
  pic_phone: "081234567890",
  sla_tier: "TIER1_JABODETABEK",
  is_active: true,
};
