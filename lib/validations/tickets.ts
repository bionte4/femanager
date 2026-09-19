import { z } from "zod";

export const ticketTypeEnum = z.enum(["INCIDENT", "PM", "CM"]);
export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const ticketStatusEnum = z.enum([
  "OPEN",
  "ASSIGNED",
  "ON_THE_WAY",
  "ON_SITE",
  "IN_PROGRESS",
  "PENDING_SPAREPART",
  "ESCALATED",
  "PENDING_L1",
  "PENDING_REVIEW",
  "RESOLVED",
  "CLOSED",
]);

export const createTicketSchema = z
  .object({
    tenant_id: z.string().optional().nullable(),
    device_id: z.string().optional().nullable(),
    service_category_id: z.string().optional().nullable(),
    service_package_id: z.string().optional().nullable(),
    type: ticketTypeEnum.default("INCIDENT"),
    priority: priorityEnum.default("MEDIUM"),
    description: z.string().min(5, "Deskripsi minimal 5 karakter"),
    reported_by: z.string().optional().nullable(),
    tenant_code: z.string().optional().nullable(),
    device_serial: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    required_engineers: z.number().int().min(1).max(5).optional(),
  })
  .refine((d) => !!(d.tenant_id || d.tenant_code), {
    message: "tenant_id atau tenant_code wajib",
    path: ["tenant_id"],
  });

export const updateTicketStatusSchema = z.object({
  ticket_id: z.string().min(1),
  status: ticketStatusEnum,
  notes: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  photo_url: z.array(z.string()).optional(),
  photo_hash: z.string().optional().nullable(),
  exif_lat: z.number().optional().nullable(),
  exif_lng: z.number().optional().nullable(),
  exif_timestamp: z.string().optional().nullable(),
  /** Offline sync: status yang diharapkan saat aksi di-queue */
  expected_from_status: ticketStatusEnum.optional().nullable(),
});

export const assignEngineerSchema = z.object({
  ticket_id: z.string().min(1),
  engineer_id: z.string().min(1),
  notes: z.string().optional().nullable(),
  /** Super admin: lewati Workload Guard */
  override_workload: z.boolean().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AssignEngineerInput = z.infer<typeof assignEngineerSchema>;
