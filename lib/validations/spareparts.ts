import { z } from "zod";

export const sparepartSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  sku: z.string().min(2, "SKU minimal 2 karakter"),
  stock_qty: z.coerce.number().int().min(0),
  location_type: z.enum(["WAREHOUSE", "ENGINEER"]),
  holder_id: z.string().optional().nullable(),
});

export type SparepartInput = z.infer<typeof sparepartSchema>;
