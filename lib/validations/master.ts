import { z } from "zod";
import {
  TENANT_CODE_ERROR,
  TENANT_CODE_REGEX,
  normalizeCode,
} from "@/lib/code-conventions";

export const slaTierEnum = z.enum([
  "TIER1_JABODETABEK",
  "TIER2_PROVINCE",
  "TIER3_KABUPATEN",
]);

export const deviceTypeEnum = z.enum([
  "EDC_BCA",
  "EDC_BRI",
  "ROUTER",
  "ROUTER_SDWAN",
  "SWITCH",
]);

export const deviceCategoryEnum = z.enum([
  "EDC",
  "ROUTER_SDWAN",
  "SWITCH",
  "ACCESS_POINT",
  "SERVER",
]);

export const deviceStatusEnum = z.enum(["UP", "DOWN", "MAINTENANCE"]);

export const skillEnum = z.enum([
  "EDC",
  "SDWAN",
  "DESKTOP",
  "LAPTOP",
  "WIFI",
  "CCTV",
  "PRINTER",
]);

export const engineerStatusEnum = z.enum(["AVAILABLE", "BUSY", "OFFLINE"]);

export const tenantSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  code: z
    .string()
    .min(8, "Kode terlalu pendek")
    .max(16)
    .transform((v) => normalizeCode(v))
    .refine((v) => TENANT_CODE_REGEX.test(v), {
      message: TENANT_CODE_ERROR,
    }),
  address: z.string().min(5, "Alamat wajib diisi"),
  province: z.string().min(2, "Provinsi wajib"),
  city: z.string().min(2, "Kota wajib"),
  district: z.string().min(2, "Kecamatan wajib"),
  sub_district: z.string().optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  pic_name: z.string().optional().nullable(),
  pic_phone: z.string().optional().nullable(),
  sla_tier: slaTierEnum,
  is_active: z.boolean().default(true),
});

export const deviceSchema = z.object({
  tenant_id: z.string().min(1, "Tenant wajib dipilih"),
  type: deviceTypeEnum,
  device_category: deviceCategoryEnum.optional(),
  brand: z.string().optional().nullable(),
  serial_number: z.string().min(3, "Serial number wajib"),
  ip_address: z.string().optional().nullable(),
  status: deviceStatusEnum,
});

export const engineerSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter"),
  phone: z
    .string()
    .min(10, "Nomor HP tidak valid")
    .max(15)
    .regex(/^08\d+$/, "Gunakan format 08xxxxxxxxxx"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  city: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  skills: z.array(z.string().min(1)).min(1, "Pilih minimal 1 skill"),
  status: engineerStatusEnum,
  telegram_chat_id: z
    .string()
    .max(64)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t || null;
    }),
  email: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t || null;
    })
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Format email tidak valid",
    }),
  /// YYYY-MM-DD dari <input type="date">; kosong = null
  birth_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t || null;
    })
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Format tanggal lahir YYYY-MM-DD",
    }),
});

export const slaConfigSchema = z.object({
  id: z.string().min(1),
  response_time_minutes: z.number().int().min(1).max(10080),
  resolution_time_minutes: z.number().int().min(1).max(20160),
});

export type TenantInput = z.infer<typeof tenantSchema>;
export type DeviceInput = z.infer<typeof deviceSchema>;
export type EngineerInput = z.infer<typeof engineerSchema>;
export type SlaConfigInput = z.infer<typeof slaConfigSchema>;
