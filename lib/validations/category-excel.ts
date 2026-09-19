import { z } from "zod";
import type { ExcelPreviewAction } from "@/lib/excel";

export const CATEGORY_EXCEL_HEADERS = [
  "code",
  "name",
  "icon",
  "base_fee_tier1",
  "base_fee_tier2",
  "base_fee_tier3",
  "estimated_duration_minutes",
  "requires_certification",
  "is_active",
] as const;

export const categoryExcelRowSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(32)
    .transform((v) => v.trim().toUpperCase()),
  name: z.string().min(2).max(120),
  icon: z.string().max(40).optional().nullable(),
  base_fee_tier1: z.coerce.number().int().min(0),
  base_fee_tier2: z.coerce.number().int().min(0),
  base_fee_tier3: z.coerce.number().int().min(0),
  estimated_duration_minutes: z.coerce.number().int().min(15).max(1440).default(60),
  requires_certification: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type CategoryExcelRow = z.infer<typeof categoryExcelRowSchema>;

export type CategoryPreviewRow = {
  row: number;
  code: string;
  name: string;
  base_fee_tier1: number;
  action: ExcelPreviewAction;
  existing_id?: string;
  payload?: CategoryExcelRow;
  errors: string[];
};

export const CATEGORY_SAMPLE_ROW = {
  code: "WIFI",
  name: "WiFi / Access Point",
  icon: "wifi",
  base_fee_tier1: 75000,
  base_fee_tier2: 90000,
  base_fee_tier3: 110000,
  estimated_duration_minutes: 60,
  requires_certification: false,
  is_active: true,
};
