import { z } from "zod";
import {
  WAREHOUSE_CODE_ERROR,
  WAREHOUSE_CODE_REGEX,
  normalizeCode,
} from "@/lib/code-conventions";

export const warehouseSchema = z.object({
  code: z
    .string()
    .min(2, "Kode minimal 2 karakter")
    .max(6)
    .transform((v) => normalizeCode(v))
    .refine((v) => WAREHOUSE_CODE_REGEX.test(v), {
      message: WAREHOUSE_CODE_ERROR,
    }),
  name: z.string().min(2, "Nama minimal 2 karakter").max(120),
  city: z
    .string()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t || null;
    }),
  address: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t || null;
    }),
  is_active: z.boolean().default(true),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
