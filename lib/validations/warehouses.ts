import { z } from "zod";

export const warehouseSchema = z.object({
  code: z
    .string()
    .min(2, "Kode minimal 2 karakter")
    .max(32)
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => /^[A-Z0-9_-]+$/.test(v), {
      message: "Kode hanya huruf/angka/_/-",
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
