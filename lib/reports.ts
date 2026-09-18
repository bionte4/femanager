import type { Prisma, SlaTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatDurationMinutes,
  getTicketSlaStatus,
  type SlaStatus,
} from "@/lib/sla";

export type ReportFilters = {
  from?: string;
  to?: string;
  city?: string;
  engineer_id?: string;
  sla_tier?: SlaTier | string;
};

export type ReportRow = {
  id: string;
  ticket_no: string;
  tenant: string;
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
      tenant: { select: { name: true, city: true, sla_tier: true } },
      assigned_engineer: { select: { full_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 2000,
  });

  return tickets.map((t) => {
    const durationMs =
      t.resolved_at != null
        ? t.resolved_at.getTime() - t.created_at.getTime()
        : null;

    return {
      id: t.id,
      ticket_no: t.ticket_no,
      tenant: t.tenant.name,
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
    };
  });
}

export async function getReportFilterOptions() {
  const [citiesRaw, engineers] = await Promise.all([
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
  ]);

  return {
    cities: citiesRaw.map((c) => c.city).filter(Boolean),
    engineers,
    sla_tiers: [
      { value: "TIER1_JABODETABEK", label: "Tier 1 Jabodetabek" },
      { value: "TIER2_PROVINCE", label: "Tier 2 Province" },
      { value: "TIER3_KABUPATEN", label: "Tier 3 Kabupaten" },
    ],
  };
}
