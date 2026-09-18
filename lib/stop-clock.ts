/**
 * Stop clock SLA: saat pause, countdown dibekukan.
 * Saat resume, sisa waktu ditambahkan ke sla_due_at.
 */

export type StopClockTicket = {
  sla_due_at: Date | null;
  sla_paused_at: Date | null;
  sla_paused_total_ms: number;
};

/** Sisa ms efektif — jika sedang pause, freeze di momen pause */
export function getEffectiveSlaRemainingMs(
  ticket: StopClockTicket,
  now: number = Date.now()
): number | null {
  if (!ticket.sla_due_at) return null;

  if (ticket.sla_paused_at) {
    return ticket.sla_due_at.getTime() - ticket.sla_paused_at.getTime();
  }

  return ticket.sla_due_at.getTime() - now;
}

/** Due date efektif untuk UI countdown (null = no SLA) */
export function getEffectiveSlaDueAt(
  ticket: StopClockTicket,
  now: Date = new Date()
): Date | null {
  if (!ticket.sla_due_at) return null;

  // Saat pause: shift due seolah waktu tidak berjalan (due = now + remaining at pause)
  if (ticket.sla_paused_at) {
    const remaining =
      ticket.sla_due_at.getTime() - ticket.sla_paused_at.getTime();
    return new Date(now.getTime() + remaining);
  }

  return ticket.sla_due_at;
}

export function computeResumeSlaDueAt(
  ticket: StopClockTicket,
  now: Date = new Date()
): { sla_due_at: Date; pause_ms: number; sla_paused_total_ms: number } {
  if (!ticket.sla_due_at || !ticket.sla_paused_at) {
    throw new Error("Ticket tidak sedang di-pause");
  }

  const pause_ms = Math.max(0, now.getTime() - ticket.sla_paused_at.getTime());
  const sla_due_at = new Date(ticket.sla_due_at.getTime() + pause_ms);

  return {
    sla_due_at,
    pause_ms,
    sla_paused_total_ms: ticket.sla_paused_total_ms + pause_ms,
  };
}
