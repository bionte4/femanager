import { z } from "zod";

export const externalCreateTicketSchema = z.object({
  external_ticket_id: z.string().min(1).max(100),
  tenant_code: z.string().min(1).max(50),
  device_serial: z.string().min(1).max(100).optional().nullable(),
  type: z.enum(["INCIDENT", "PM", "CM"]).default("INCIDENT"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  description: z.string().min(3).max(2000),
  reported_by: z.string().max(100).optional().nullable(),
});

export const externalPatchTicketSchema = z.object({
  status: z.enum(["closed", "cancelled"]),
  notes: z.string().max(1000).optional().nullable(),
});

export type ExternalCreateTicketInput = z.infer<typeof externalCreateTicketSchema>;
export type ExternalPatchTicketInput = z.infer<typeof externalPatchTicketSchema>;

export const PRIORITY_MAP = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "CRITICAL",
} as const;
