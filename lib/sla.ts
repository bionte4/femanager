import type { Ticket, TicketStatus } from "@prisma/client";

const CLOSED_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

export type SlaStatus = "meet" | "breach" | "open";

/**
 * Ticket dianggap closed untuk perhitungan SLA jika RESOLVED atau CLOSED.
 */
export function isClosedTicket(status: TicketStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * SLA Meet: (total closed ontime / total closed) * 100%
 * Ontime = resolved_at <= sla_due_at (atau tanpa sla_due_at dianggap meet).
 */
export function calculateSlaMeetPercent(
  tickets: Array<Pick<Ticket, "status" | "resolved_at" | "sla_due_at">>
): number {
  const closed = tickets.filter((t) => isClosedTicket(t.status) && t.resolved_at);
  if (closed.length === 0) return 100;

  const ontime = closed.filter((t) => {
    if (!t.sla_due_at || !t.resolved_at) return true;
    return t.resolved_at.getTime() <= t.sla_due_at.getTime();
  });

  return Math.round((ontime.length / closed.length) * 1000) / 10;
}

/**
 * MTTR dalam menit (Mean Time To Resolve) dari created_at → resolved_at.
 */
export function calculateMttrMinutes(
  tickets: Array<Pick<Ticket, "status" | "created_at" | "resolved_at">>
): number {
  const resolved = tickets.filter((t) => isClosedTicket(t.status) && t.resolved_at);
  if (resolved.length === 0) return 0;

  const totalMs = resolved.reduce((sum, t) => {
    return sum + (t.resolved_at!.getTime() - t.created_at.getTime());
  }, 0);

  return Math.round(totalMs / resolved.length / 60_000);
}

export function formatMttr(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h} jam`;
}

/**
 * Status SLA per ticket untuk laporan export.
 */
export function getTicketSlaStatus(
  ticket: Pick<Ticket, "status" | "resolved_at" | "sla_due_at">
): SlaStatus {
  if (!isClosedTicket(ticket.status) || !ticket.resolved_at) {
    if (ticket.sla_due_at && Date.now() > ticket.sla_due_at.getTime()) {
      return "breach";
    }
    return "open";
  }
  if (!ticket.sla_due_at) return "meet";
  return ticket.resolved_at.getTime() <= ticket.sla_due_at.getTime()
    ? "meet"
    : "breach";
}

export function formatDurationMinutes(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}j ${String(m).padStart(2, "0")}m`;
  return `${m} mnt`;
}

/** Awal bulan lokal (server) */
export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/** N hari ke belakang dari sekarang (mulai jam 00:00) */
export function startOfDayDaysAgo(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}
