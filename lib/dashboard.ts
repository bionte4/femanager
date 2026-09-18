import { Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateMttrMinutes,
  calculateSlaMeetPercent,
  startOfDayDaysAgo,
  startOfMonth,
} from "@/lib/sla";

const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.ON_THE_WAY,
  TicketStatus.ON_SITE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING_SPAREPART,
  TicketStatus.ESCALATED,
];

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const sevenDaysAgo = startOfDayDaysAgo(6, now);

  const [monthTickets, allTicketsCount, overdueCount, overdueTickets, statusGroups, recentTickets, engineers] =
    await Promise.all([
      prisma.ticket.findMany({
        where: { created_at: { gte: monthStart } },
        select: {
          id: true,
          status: true,
          created_at: true,
          resolved_at: true,
          sla_due_at: true,
        },
      }),
      prisma.ticket.count(),
      prisma.ticket.count({
        where: {
          status: { in: OPEN_STATUSES },
          sla_due_at: { lt: now },
        },
      }),
      prisma.ticket.findMany({
        where: {
          status: { in: OPEN_STATUSES },
          sla_due_at: { lt: now },
        },
        select: {
          id: true,
          ticket_no: true,
          status: true,
          priority: true,
          sla_due_at: true,
          created_at: true,
          tenant: { select: { name: true, city: true } },
          assigned_engineer: { select: { full_name: true } },
        },
        orderBy: { sla_due_at: "asc" },
        take: 20,
      }),
      prisma.ticket.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.ticket.findMany({
        where: { created_at: { gte: sevenDaysAgo } },
        select: { created_at: true },
      }),
      prisma.user.findMany({
        where: { role: Role.FIELD_ENGINEER },
        select: {
          id: true,
          full_name: true,
          rating: true,
          city: true,
          status: true,
          assigned_tickets: {
            where: {
              status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
              resolved_at: { not: null },
            },
            select: {
              created_at: true,
              resolved_at: true,
            },
          },
        },
      }),
    ]);

  const slaAchievement = calculateSlaMeetPercent(monthTickets);
  const mttrMinutes = calculateMttrMinutes(monthTickets);

  // Ticket per hari (7 hari terakhir)
  const ticketsPerDay: { date: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = startOfDayDaysAgo(i, now);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = recentTickets.filter(
      (t) => t.created_at >= day && t.created_at < next
    ).length;
    ticketsPerDay.push({
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      count,
    });
  }

  const statusPie = statusGroups.map((g) => ({
    status: g.status,
    count: g._count._all,
  }));

  // Top 5 engineer: paling banyak closed + MTTR tercepat
  const topEngineers = engineers
    .map((e) => {
      const closedCount = e.assigned_tickets.length;
      const avgResolveMs =
        closedCount === 0
          ? Number.POSITIVE_INFINITY
          : e.assigned_tickets.reduce(
              (sum, t) => sum + (t.resolved_at!.getTime() - t.created_at.getTime()),
              0
            ) / closedCount;
      return {
        id: e.id,
        full_name: e.full_name,
        rating: e.rating,
        city: e.city,
        status: e.status,
        closed_count: closedCount,
        avg_resolve_minutes:
          closedCount === 0 ? null : Math.round(avgResolveMs / 60_000),
      };
    })
    .sort((a, b) => {
      if (b.closed_count !== a.closed_count) return b.closed_count - a.closed_count;
      const aMttr = a.avg_resolve_minutes ?? Number.POSITIVE_INFINITY;
      const bMttr = b.avg_resolve_minutes ?? Number.POSITIVE_INFINITY;
      return aMttr - bMttr;
    })
    .slice(0, 5);

  return {
    kpis: {
      sla_achievement: slaAchievement,
      mttr_minutes: mttrMinutes,
      total_tickets: allTicketsCount,
      overdue_count: overdueCount,
      month_ticket_count: monthTickets.length,
    },
    tickets_per_day: ticketsPerDay,
    status_pie: statusPie,
    top_engineers: topEngineers,
    overdue_tickets: overdueTickets.map((t) => ({
      id: t.id,
      ticket_no: t.ticket_no,
      status: t.status,
      priority: t.priority,
      sla_due_at: t.sla_due_at?.toISOString() ?? null,
      created_at: t.created_at.toISOString(),
      tenant_name: t.tenant.name,
      tenant_city: t.tenant.city,
      engineer_name: t.assigned_engineer?.full_name ?? null,
    })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
