import { Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateMttrMinutes,
  calculateSlaMeetPercent,
} from "@/lib/sla";

export async function getEngineerPerformance(engineerId: string) {
  const engineer = await prisma.user.findFirst({
    where: { id: engineerId, role: Role.FIELD_ENGINEER },
  });

  if (!engineer) return null;

  const tickets = await prisma.ticket.findMany({
    where: { assigned_engineer_id: engineerId },
    include: {
      tenant: { select: { name: true, city: true } },
      device: { select: { type: true, serial_number: true } },
      service_category: { select: { code: true, name: true } },
      logs: {
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          photo_url: true,
          notes: true,
          created_at: true,
          status_to: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const closed = tickets.filter(
    (t) =>
      (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) &&
      t.resolved_at
  );

  // Badge spesialis: >10 ticket closed per kategori
  const categoryCounts = new Map<string, number>();
  for (const t of closed) {
    const code = t.service_category?.code;
    if (!code) continue;
    categoryCounts.set(code, (categoryCounts.get(code) ?? 0) + 1);
  }
  const specialistBadges = Array.from(categoryCounts.entries())
    .filter(([, n]) => n > 10)
    .map(([code, n]) => ({
      code,
      label:
        code === "CCTV"
          ? "Spesialis CCTV"
          : code === "WIFI"
            ? "Expert WiFi"
            : code === "LAPTOP"
              ? "Expert Laptop"
              : code === "SDWAN"
                ? "Expert SDWAN"
                : `Spesialis ${code}`,
      count: n,
    }));

  const photos = tickets.flatMap((t) =>
    t.logs
      .filter((log) => log.photo_url.length > 0)
      .flatMap((log) =>
        log.photo_url.map((url) => ({
          url,
          ticket_no: t.ticket_no,
          ticket_id: t.id,
          notes: log.notes,
          created_at: log.created_at.toISOString(),
          status: log.status_to,
        }))
      )
  );

  return {
    engineer: {
      id: engineer.id,
      full_name: engineer.full_name,
      phone: engineer.phone,
      city: engineer.city,
      district: engineer.district,
      lat: engineer.lat,
      lng: engineer.lng,
      skills: engineer.skills,
      status: engineer.status,
      rating: engineer.rating,
      partnership_status: engineer.partnership_status,
      engagement_type: engineer.engagement_type,
      employment_status: engineer.employment_status,
      can_work_for_others: engineer.can_work_for_others,
      tools_owned: Array.isArray(engineer.tools_owned)
        ? (engineer.tools_owned as string[])
        : [
            engineer.has_motorcycle ? "motorcycle" : null,
            engineer.has_toolkit ? "toolkit" : null,
            engineer.has_car ? "car" : null,
          ].filter(Boolean) as string[],
    },
    stats: {
      total_tickets: tickets.length,
      closed_tickets: closed.length,
      active_tickets: tickets.filter(
        (t) =>
          t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
      ).length,
      mttr_minutes: calculateMttrMinutes(tickets),
      sla_meet_rate: calculateSlaMeetPercent(tickets),
    },
    recent_tickets: tickets.slice(0, 15).map((t) => ({
      id: t.id,
      ticket_no: t.ticket_no,
      status: t.status,
      priority: t.priority,
      tenant_name: t.tenant.name,
      tenant_city: t.tenant.city,
      device_type: t.device?.type ?? null,
      created_at: t.created_at.toISOString(),
      resolved_at: t.resolved_at?.toISOString() ?? null,
      sla_due_at: t.sla_due_at?.toISOString() ?? null,
    })),
    photos: photos.slice(0, 40),
    specialist_badges: specialistBadges,
  };
}

export type EngineerPerformance = NonNullable<
  Awaited<ReturnType<typeof getEngineerPerformance>>
>;
