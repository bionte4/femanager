import type { TicketStatus } from "@prisma/client";
import { formatDurationMinutes } from "@/lib/sla";

export type TicketLogPhaseInput = {
  status_to: TicketStatus;
  created_at: Date;
  notes?: string | null;
};

export type TicketPhaseInput = {
  created_at: Date;
  response_at: Date | null;
  accepted_at: Date | null;
  resolved_at: Date | null;
  sla_paused_at: Date | null;
  sla_paused_total_ms: number;
  logs?: TicketLogPhaseInput[];
};

export type SlaPhasesMs = {
  /** created → response / ASSIGNED */
  response_ms: number | null;
  /** ON_THE_WAY → ON_SITE (fallback: accepted → ON_SITE) */
  travel_ms: number | null;
  /** ON_SITE → IN_PROGRESS */
  onsite_ms: number | null;
  /** IN_PROGRESS → RESOLVED */
  repair_ms: number | null;
  /** Total pause (termasuk pause aktif) */
  pause_ms: number;
  /** created → resolved dikurangi pause */
  active_ms: number | null;
  /** created → resolved kotor */
  total_ms: number | null;
};

function firstLogAt(
  logs: TicketLogPhaseInput[] | undefined,
  status: TicketStatus
): Date | null {
  if (!logs?.length) return null;
  const hit = logs.find((l) => l.status_to === status);
  return hit ? hit.created_at : null;
}

function msBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  const d = to.getTime() - from.getTime();
  return d >= 0 ? d : null;
}

/**
 * Pecah durasi ticket jadi fase operasional.
 * Dipakai laporan SLA phase & MTTR breakdown.
 */
export function computeSlaPhases(
  ticket: TicketPhaseInput,
  now: Date = new Date()
): SlaPhasesMs {
  const logs = ticket.logs ?? [];

  const assignedAt =
    ticket.response_at ?? firstLogAt(logs, "ASSIGNED");
  const onTheWayAt = firstLogAt(logs, "ON_THE_WAY");
  const onSiteAt = firstLogAt(logs, "ON_SITE");
  const inProgressAt = firstLogAt(logs, "IN_PROGRESS");
  const resolvedAt =
    ticket.resolved_at ?? firstLogAt(logs, "RESOLVED") ?? firstLogAt(logs, "CLOSED");

  const response_ms = msBetween(ticket.created_at, assignedAt);

  // Travel: prefer ON_THE_WAY → ON_SITE; fallback accepted/assigned → ON_SITE
  const travelStart =
    onTheWayAt ?? ticket.accepted_at ?? assignedAt;
  const travel_ms = msBetween(travelStart, onSiteAt);

  const onsite_ms = msBetween(onSiteAt, inProgressAt);

  const repairStart = inProgressAt ?? onSiteAt;
  const repair_ms = msBetween(repairStart, resolvedAt);

  let pause_ms = ticket.sla_paused_total_ms ?? 0;
  if (ticket.sla_paused_at) {
    pause_ms += Math.max(0, now.getTime() - ticket.sla_paused_at.getTime());
  }

  const total_ms = msBetween(ticket.created_at, resolvedAt);
  const active_ms =
    total_ms != null ? Math.max(0, total_ms - pause_ms) : null;

  return {
    response_ms,
    travel_ms,
    onsite_ms,
    repair_ms,
    pause_ms,
    active_ms,
    total_ms,
  };
}

export function formatPhase(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  return formatDurationMinutes(ms);
}

export type PhaseAverages = {
  response_avg_ms: number | null;
  travel_avg_ms: number | null;
  onsite_avg_ms: number | null;
  repair_avg_ms: number | null;
  pause_avg_ms: number | null;
  active_avg_ms: number | null;
  sample: number;
};

export function averagePhases(phases: SlaPhasesMs[]): PhaseAverages {
  const avg = (pick: (p: SlaPhasesMs) => number | null) => {
    const vals = phases.map(pick).filter((v): v is number => v != null && v >= 0);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return {
    response_avg_ms: avg((p) => p.response_ms),
    travel_avg_ms: avg((p) => p.travel_ms),
    onsite_avg_ms: avg((p) => p.onsite_ms),
    repair_avg_ms: avg((p) => p.repair_ms),
    pause_avg_ms: avg((p) => (p.pause_ms > 0 ? p.pause_ms : null)),
    active_avg_ms: avg((p) => p.active_ms),
    sample: phases.length,
  };
}
