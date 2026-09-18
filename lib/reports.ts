import type { Prisma, SlaTier, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatDurationMinutes,
  getTicketSlaStatus,
  type SlaStatus,
} from "@/lib/sla";
import {
  averagePhases,
  computeSlaPhases,
  formatPhase,
  type PhaseAverages,
  type SlaPhasesMs,
} from "@/lib/sla-phases";

export type ReportFilters = {
  from?: string;
  to?: string;
  city?: string;
  engineer_id?: string;
  sla_tier?: SlaTier | string;
  tenant_id?: string;
};

export type ReportRow = {
  id: string;
  ticket_no: string;
  tenant: string;
  tenant_code: string;
  city: string;
  sla_tier: string;
  engineer: string;
  open_at: string;
  resolved_at: string | null;
  duration: string;
  duration_ms: number | null;
  sla_status: SlaStatus;
  status: string;
  priority: string;
  phases: SlaPhasesMs;
  phase_response: string;
  phase_travel: string;
  phase_onsite: string;
  phase_repair: string;
  phase_pause: string;
};

function buildWhere(filters: ReportFilters): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};

  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) {
      where.created_at.gte = new Date(filters.from);
    }
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  if (filters.engineer_id) {
    where.assigned_engineer_id = filters.engineer_id;
  }

  if (filters.tenant_id) {
    where.tenant_id = filters.tenant_id;
  }

  if (filters.city || filters.sla_tier) {
    where.tenant = {};
    if (filters.city) {
      where.tenant.city = { equals: filters.city, mode: "insensitive" };
    }
    if (filters.sla_tier) {
      where.tenant.sla_tier = filters.sla_tier as SlaTier;
    }
  }

  return where;
}

export async function getReportRows(filters: ReportFilters): Promise<ReportRow[]> {
  const tickets = await prisma.ticket.findMany({
    where: buildWhere(filters),
    include: {
      tenant: { select: { name: true, code: true, city: true, sla_tier: true } },
      assigned_engineer: { select: { full_name: true } },
      logs: {
        select: { status_to: true, created_at: true, notes: true },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "desc" },
    take: 2000,
  });

  return tickets.map((t) => {
    const phases = computeSlaPhases({
      created_at: t.created_at,
      response_at: t.response_at,
      accepted_at: t.accepted_at,
      resolved_at: t.resolved_at,
      sla_paused_at: t.sla_paused_at,
      sla_paused_total_ms: t.sla_paused_total_ms,
      logs: t.logs,
    });

    const durationMs = phases.total_ms;

    return {
      id: t.id,
      ticket_no: t.ticket_no,
      tenant: t.tenant.name,
      tenant_code: t.tenant.code,
      city: t.tenant.city,
      sla_tier: t.tenant.sla_tier,
      engineer: t.assigned_engineer?.full_name ?? "—",
      open_at: t.created_at.toISOString(),
      resolved_at: t.resolved_at?.toISOString() ?? null,
      duration: durationMs != null ? formatDurationMinutes(durationMs) : "—",
      duration_ms: durationMs,
      sla_status: getTicketSlaStatus(t),
      status: t.status,
      priority: t.priority,
      phases,
      phase_response: formatPhase(phases.response_ms),
      phase_travel: formatPhase(phases.travel_ms),
      phase_onsite: formatPhase(phases.onsite_ms),
      phase_repair: formatPhase(phases.repair_ms),
      phase_pause: phases.pause_ms > 0 ? formatPhase(phases.pause_ms) : "—",
    };
  });
}

export function getPhaseSummary(rows: ReportRow[]): PhaseAverages {
  return averagePhases(rows.map((r) => r.phases));
}

export async function getReportFilterOptions() {
  const [citiesRaw, engineers, tenants] = await Promise.all([
    prisma.tenant.findMany({
      where: { is_active: true },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "FIELD_ENGINEER" },
      select: { id: true, full_name: true, city: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.tenant.findMany({
      where: { is_active: true },
      select: { id: true, name: true, code: true, city: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return {
    cities: citiesRaw.map((c) => c.city).filter(Boolean),
    engineers,
    tenants,
    sla_tiers: [
      { value: "TIER1_JABODETABEK", label: "Tier 1 Jabodetabek" },
      { value: "TIER2_PROVINCE", label: "Tier 2 Province" },
      { value: "TIER3_KABUPATEN", label: "Tier 3 Kabupaten" },
    ],
  };
}

// ─── Pause leakage audit ───────────────────────────────────────────

export type PauseAuditRow = {
  id: string;
  ticket_no: string;
  tenant: string;
  city: string;
  status: TicketStatus;
  engineer: string | null;
  pause_ms: number;
  pause_label: string;
  stop_count: number;
  currently_paused: boolean;
  has_sparepart_status: boolean;
  stop_clock_reason: string | null;
  /** Pause tinggi tanpa jejak sparepart → perlu review */
  leakage_flag: boolean;
  created_at: string;
};

const DEFAULT_PAUSE_THRESHOLD_MS = 60 * 60 * 1000; // 1 jam

export async function getPauseAuditRows(params?: {
  from?: string;
  to?: string;
  min_pause_ms?: number;
}): Promise<PauseAuditRow[]> {
  const minPause = params?.min_pause_ms ?? DEFAULT_PAUSE_THRESHOLD_MS;
  const where: Prisma.TicketWhereInput = {
    OR: [
      { sla_paused_at: { not: null } },
      { sla_paused_total_ms: { gte: minPause } },
    ],
  };

  if (params?.from || params?.to) {
    where.created_at = {};
    if (params.from) where.created_at.gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      tenant: { select: { name: true, city: true } },
      assigned_engineer: { select: { full_name: true } },
      logs: {
        select: { status_to: true, notes: true },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: [{ sla_paused_total_ms: "desc" }, { updated_at: "desc" }],
    take: 300,
  });

  const now = Date.now();

  return tickets
    .map((t) => {
      let pause_ms = t.sla_paused_total_ms;
      if (t.sla_paused_at) {
        pause_ms += Math.max(0, now - t.sla_paused_at.getTime());
      }

      const stop_count = t.logs.filter(
        (l) => l.notes?.includes("STOP CLOCK") || l.notes?.startsWith("STOP CLOCK")
      ).length;

      const has_sparepart_status =
        t.status === "PENDING_SPAREPART" ||
        t.logs.some(
          (l) =>
            l.status_to === "PENDING_SPAREPART" ||
            /sparepart/i.test(l.notes ?? "")
        );

      const leakage_flag =
        pause_ms >= minPause && !has_sparepart_status && stop_count >= 1;

      return {
        id: t.id,
        ticket_no: t.ticket_no,
        tenant: t.tenant.name,
        city: t.tenant.city,
        status: t.status,
        engineer: t.assigned_engineer?.full_name ?? null,
        pause_ms,
        pause_label: formatDurationMinutes(pause_ms),
        stop_count,
        currently_paused: !!t.sla_paused_at,
        has_sparepart_status,
        stop_clock_reason: t.stop_clock_reason,
        leakage_flag,
        created_at: t.created_at.toISOString(),
      };
    })
    .filter((r) => r.pause_ms >= minPause || r.currently_paused)
    .sort((a, b) => {
      if (a.leakage_flag !== b.leakage_flag) return a.leakage_flag ? -1 : 1;
      return b.pause_ms - a.pause_ms;
    });
}

export type CustomerSlaReport = {
  period_label: string;
  from: string;
  to: string;
  tenant: { id: string; name: string; code: string; city: string; sla_tier: string } | null;
  city_filter: string | null;
  summary: {
    total: number;
    closed: number;
    meet: number;
    breach: number;
    meet_pct: number;
    open: number;
  };
  phases: PhaseAverages;
  rows: ReportRow[];
  generated_at: string;
};

export async function buildCustomerSlaReport(
  filters: ReportFilters
): Promise<CustomerSlaReport> {
  const rows = await getReportRows(filters);
  const meet = rows.filter((r) => r.sla_status === "meet").length;
  const breach = rows.filter((r) => r.sla_status === "breach").length;
  const open = rows.filter((r) => r.sla_status === "open").length;
  const closed = meet + breach;

  let tenant: CustomerSlaReport["tenant"] = null;
  if (filters.tenant_id) {
    const t = await prisma.tenant.findUnique({
      where: { id: filters.tenant_id },
      select: { id: true, name: true, code: true, city: true, sla_tier: true },
    });
    tenant = t;
  }

  const from = filters.from || "—";
  const to = filters.to || "—";

  return {
    period_label: `${from} s/d ${to}`,
    from,
    to,
    tenant,
    city_filter: filters.city ?? null,
    summary: {
      total: rows.length,
      closed,
      meet,
      breach,
      meet_pct: closed === 0 ? 100 : Math.round((meet / closed) * 1000) / 10,
      open,
    },
    phases: averagePhases(rows.map((r) => r.phases)),
    rows: rows.slice(0, 80),
    generated_at: new Date().toISOString(),
  };
}
