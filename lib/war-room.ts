import { DeviceStatus, EngineerStatus, Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACTIVE: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.ON_THE_WAY,
  TicketStatus.ON_SITE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING_SPAREPART,
  TicketStatus.ESCALATED,
  TicketStatus.PENDING_L1,
];

export async function getWarRoomSnapshot() {
  const now = new Date();

  const [
    downDevices,
    overdueTickets,
    l1Queue,
    availableEngineers,
    busyEngineers,
    openCount,
    pendingL1Count,
    overdueCount,
    downCount,
    dlqPending,
  ] = await Promise.all([
    prisma.device.findMany({
      where: { status: DeviceStatus.DOWN },
      include: {
        tenant: { select: { id: true, name: true, code: true, city: true } },
      },
      orderBy: { last_check_at: "asc" },
      take: 40,
    }),
    prisma.ticket.findMany({
      where: {
        status: { in: ACTIVE },
        sla_due_at: { lt: now },
        sla_paused_at: null,
      },
      include: {
        tenant: { select: { name: true, code: true, city: true } },
        assigned_engineer: { select: { full_name: true } },
      },
      orderBy: { sla_due_at: "asc" },
      take: 40,
    }),
    prisma.ticket.findMany({
      where: { status: TicketStatus.PENDING_L1 },
      include: {
        tenant: { select: { name: true, code: true, city: true } },
        device: { select: { type: true, serial_number: true } },
      },
      orderBy: { escalated_to_l1_at: "asc" },
      take: 40,
    }),
    prisma.user.findMany({
      where: {
        role: Role.FIELD_ENGINEER,
        status: EngineerStatus.AVAILABLE,
        is_suspended: false,
      },
      select: {
        id: true,
        full_name: true,
        phone: true,
        city: true,
        skills: true,
        lat: true,
        lng: true,
      },
      orderBy: { full_name: "asc" },
      take: 50,
    }),
    prisma.user.count({
      where: {
        role: Role.FIELD_ENGINEER,
        status: EngineerStatus.BUSY,
      },
    }),
    prisma.ticket.count({ where: { status: { in: ACTIVE } } }),
    prisma.ticket.count({ where: { status: TicketStatus.PENDING_L1 } }),
    prisma.ticket.count({
      where: {
        status: { in: ACTIVE },
        sla_due_at: { lt: now },
        sla_paused_at: null,
      },
    }),
    prisma.device.count({ where: { status: DeviceStatus.DOWN } }),
    prisma.webhookDeadLetter.count({
      where: { status: { in: ["PENDING", "RETRYING"] } },
    }),
  ]);

  return {
    generated_at: now.toISOString(),
    kpi: {
      down_devices: downCount,
      overdue: overdueCount,
      pending_l1: pendingL1Count,
      open_tickets: openCount,
      fe_available: availableEngineers.length,
      fe_busy: busyEngineers,
      webhook_dlq: dlqPending,
    },
    down_devices: downDevices.map((d) => ({
      id: d.id,
      type: d.type,
      serial_number: d.serial_number,
      last_check_at: d.last_check_at?.toISOString() ?? null,
      tenant: d.tenant,
    })),
    overdue: overdueTickets.map((t) => ({
      id: t.id,
      ticket_no: t.ticket_no,
      status: t.status,
      priority: t.priority,
      sla_due_at: t.sla_due_at?.toISOString() ?? null,
      tenant: t.tenant,
      engineer: t.assigned_engineer?.full_name ?? null,
    })),
    l1_queue: l1Queue.map((t) => ({
      id: t.id,
      ticket_no: t.ticket_no,
      priority: t.priority,
      escalated_to_l1_at: t.escalated_to_l1_at?.toISOString() ?? null,
      description: t.description.slice(0, 120),
      tenant: t.tenant,
      device: t.device,
    })),
    engineers_available: availableEngineers,
  };
}

export type WarRoomSnapshot = Awaited<ReturnType<typeof getWarRoomSnapshot>>;
