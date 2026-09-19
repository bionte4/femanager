import { z } from "zod";
import type { ExcelPreviewAction } from "@/lib/excel";

export const DEVICE_EXCEL_HEADERS = [
  "serial_number",
  "tenant_code",
  "type",
  "device_category",
  "brand",
  "model",
  "ip_address",
  "status",
  "service_category_code",
] as const;

export const deviceExcelRowSchema = z.object({
  serial_number: z.string().min(3).max(120).transform((v) => v.trim()),
  tenant_code: z
    .string()
    .min(3)
    .max(32)
    .transform((v) => v.trim().toUpperCase()),
  type: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.enum(["EDC_BCA", "EDC_BRI", "ROUTER", "ROUTER_SDWAN", "SWITCH"])),
  device_category: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(
      z.enum(["EDC", "ROUTER_SDWAN", "SWITCH", "ACCESS_POINT", "SERVER"])
    )
    .optional()
    .nullable(),
  brand: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  ip_address: z.string().max(64).optional().nullable(),
  status: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.enum(["UP", "DOWN", "MAINTENANCE"]))
    .default("UP"),
  service_category_code: z
    .string()
    .max(32)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim().toUpperCase();
      return t || null;
    }),
});

export type DeviceExcelRow = z.infer<typeof deviceExcelRowSchema>;

export type DevicePreviewRow = {
  row: number;
  serial_number: string;
  tenant_code: string;
  type: string;
  status: string;
  action: ExcelPreviewAction;
  existing_id?: string;
  tenant_id?: string;
  service_category_id?: string | null;
  payload?: DeviceExcelRow;
  errors: string[];
};

export const DEVICE_SAMPLE_ROW = {
  serial_number: "SN-DEMO-001",
  tenant_code: "DEMO-JKTS01",
  type: "EDC_BCA",
  device_category: "EDC",
  brand: "Ingenico",
  model: "Move/5000",
  ip_address: "10.0.0.10",
  status: "UP",
  service_category_code: "EDC",
};
