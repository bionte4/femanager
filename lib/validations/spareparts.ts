import { z } from "zod";
import {
  SKU_ERROR,
  SKU_REGEX,
  normalizeCode,
} from "@/lib/code-conventions";

export const sparepartSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    sku: z
      .string()
      .min(5, "SKU terlalu pendek")
      .max(64)
      .transform((v) => normalizeCode(v))
      .refine((v) => SKU_REGEX.test(v), { message: SKU_ERROR }),
    stock_qty: z.coerce.number().int().min(0),
    location_type: z.enum(["WAREHOUSE", "ENGINEER"]),
    warehouse_id: z.string().optional().nullable(),
    holder_id: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.location_type === "WAREHOUSE" && !data.warehouse_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["warehouse_id"],
        message: "Pilih gudang",
      });
    }
    if (data.location_type === "ENGINEER" && !data.holder_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["holder_id"],
        message: "Pilih engineer holder",
      });
    }
  });

export type SparepartInput = z.infer<typeof sparepartSchema>;
