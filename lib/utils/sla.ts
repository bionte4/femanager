import type { SlaTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Hitung sla_due_at = now + resolution_time_minutes dari sla_configs sesuai tier tenant
 */
export async function calculateSlaDueAt(
  slaTier: SlaTier,
  from: Date = new Date()
): Promise<Date> {
  const config = await prisma.slaConfig.findUnique({
    where: { tier_name: slaTier },
  });

  const minutes = config?.resolution_time_minutes ?? 240;
  return new Date(from.getTime() + minutes * 60 * 1000);
}

export function getSlaRemainingMs(dueAt: Date | string | null | undefined): number {
  if (!dueAt) return 0;
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  return due.getTime() - Date.now();
}

export type SlaLevel = "ok" | "warning" | "overdue";

/** hijau >2 jam, kuning <2 jam, merah overdue */
export function getSlaLevel(dueAt: Date | string | null | undefined): SlaLevel {
  const remaining = getSlaRemainingMs(dueAt);
  if (remaining <= 0) return "overdue";
  if (remaining < 2 * 60 * 60 * 1000) return "warning";
  return "ok";
}

export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const totalSec = Math.floor(abs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (h > 0) return `${h}j ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}d`;
}
