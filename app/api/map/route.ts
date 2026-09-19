import { NextRequest, NextResponse } from "next/server";
import { DeviceStatus, Role, TicketStatus } from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Pakai session/headers — jangan di-prerender saat `next build` */
export const dynamic = "force-dynamic";

const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.ON_THE_WAY,
  TicketStatus.ON_SITE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING_SPAREPART,
  TicketStatus.ESCALATED,
];

export type TenantMapStatus = "up" | "down" | "alert";

/**
 * GET /api/map — data peta monitoring + KPI
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !(ADMIN_ROLES as readonly string[]).includes(session.user.role)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const city = searchParams.get("city") || undefined;
    const slaTier = searchParams.get("sla_tier") || undefined;
    const statusFilter = searchParams.get("status") as TenantMapStatus | "all" | null;

    const [tenants, engineers, cities] = await Promise.all([
      prisma.tenant.findMany({
        where: {
          is_active: true,
          ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
          ...(slaTier ? { sla_tier: slaTier as never } : {}),
        },
        include: {
          devices: {
            select: {
              id: true,
              type: true,
              serial_number: true,
              status: true,
              brand: true,
            },
          },
          tickets: {
            where: { status: { in: ACTIVE_TICKET_STATUSES } },
            select: {
              id: true,
              ticket_no: true,
              status: true,
              priority: true,
              sla_due_at: true,
            },
            orderBy: { created_at: "desc" },
            take: 5,
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: {
          role: Role.FIELD_ENGINEER,
          lat: { not: null },
          lng: { not: null },
        },
        select: {
          id: true,
          full_name: true,
          phone: true,
          status: true,
          city: true,
          lat: true,
          lng: true,
          skills: true,
          rating: true,
        },
      }),
      prisma.tenant.findMany({
        where: { is_active: true },
        distinct: ["city"],
        select: { city: true },
        orderBy: { city: "asc" },
      }),
    ]);

    const mappedTenants = tenants.map((t) => {
      const hasDown = t.devices.some((d) => d.status === DeviceStatus.DOWN);
      const hasAlert = t.tickets.length > 0;
      let map_status: TenantMapStatus = "up";
      if (hasDown) map_status = "down";
      else if (hasAlert) map_status = "alert";

      return {
        id: t.id,
        name: t.name,
        code: t.code,
        address: t.address,
        city: t.city,
        province: t.province,
        district: t.district,
        lat: t.lat,
        lng: t.lng,
        sla_tier: t.sla_tier,
        map_status,
        devices: t.devices,
        active_tickets: t.tickets,
        device_down_count: t.devices.filter((d) => d.status === DeviceStatus.DOWN).length,
        device_total: t.devices.length,
      };
    });

    const filtered =
      statusFilter && statusFilter !== "all"
        ? mappedTenants.filter((t) => t.map_status === statusFilter)
        : mappedTenants;

    // KPI
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalDownDevices, overdueTickets, closedToday] = await Promise.all([
      prisma.device.count({ where: { status: DeviceStatus.DOWN } }),
      prisma.ticket.count({
        where: {
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          sla_due_at: { lt: now },
        },
      }),
      prisma.ticket.findMany({
        where: {
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          resolved_at: { gte: startOfDay },
        },
        select: { sla_due_at: true, resolved_at: true },
      }),
    ]);

    const slaMeet = closedToday.filter(
      (t) =>
        t.resolved_at &&
        t.sla_due_at &&
        t.resolved_at.getTime() <= t.sla_due_at.getTime()
    ).length;
    const slaPercent =
      closedToday.length > 0
        ? Math.round((slaMeet / closedToday.length) * 1000) / 10
        : 100;

    return NextResponse.json({
      success: true,
      data: {
        tenants: filtered,
        engineers,
        filters: {
          cities: cities.map((c) => c.city),
        },
        kpi: {
          total_tenant: mappedTenants.length,
          total_down: totalDownDevices,
          ticket_overdue: overdueTickets,
          sla_percent_today: slaPercent,
          closed_today: closedToday.length,
          sla_meet_today: slaMeet,
        },
        generated_at: now.toISOString(),
      },
    });
  } catch (e) {
    console.error("[api/map]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
