import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotifyPayload = {
  title: string;
  body: string;
  href?: string | null;
  type: string;
  ticket_id?: string | null;
};

/** Kirim notifikasi in-app ke satu user */
export async function notifyUser(
  userId: string,
  payload: NotifyPayload,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  return db.appNotification.create({
    data: {
      user_id: userId,
      title: payload.title,
      body: payload.body,
      href: payload.href ?? null,
      type: payload.type,
      ticket_id: payload.ticket_id ?? null,
    },
  });
}

/** Broadcast ke semua user dengan role tertentu */
export async function notifyRoles(
  roles: Role[],
  payload: NotifyPayload,
  excludeUserId?: string
) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (users.length === 0) return 0;

  await prisma.appNotification.createMany({
    data: users.map((u) => ({
      user_id: u.id,
      title: payload.title,
      body: payload.body,
      href: payload.href ?? null,
      type: payload.type,
      ticket_id: payload.ticket_id ?? null,
    })),
  });

  return users.length;
}

export async function notifyNewTicket(ticket: {
  id: string;
  ticket_no: string;
  description: string;
}) {
  return notifyRoles([Role.NOC_L0, Role.ADMIN_NOC, Role.DISPATCHER, Role.SUPER_ADMIN], {
    title: `Ticket baru ${ticket.ticket_no}`,
    body: ticket.description.slice(0, 120),
    href: `/admin/tickets/${ticket.id}`,
    type: "TICKET_NEW",
    ticket_id: ticket.id,
  });
}

export async function notifyEscalateL1(ticket: {
  id: string;
  ticket_no: string;
  reason?: string | null;
}) {
  return notifyRoles([Role.NOC_L1, Role.ADMIN_NOC, Role.SUPER_ADMIN], {
    title: `Eskalasi L1 · ${ticket.ticket_no}`,
    body: ticket.reason?.slice(0, 120) || "Ticket menunggu pengecekan L1",
    href: `/admin/routing?tab=l1`,
    type: "ESCALATE_L1",
    ticket_id: ticket.id,
  });
}

export async function notifyAssigned(engineerId: string, ticket: {
  id: string;
  ticket_no: string;
  tenantName: string;
}) {
  return notifyUser(engineerId, {
    title: `Job baru ${ticket.ticket_no}`,
    body: `Assigned ke ${ticket.tenantName}`,
    href: `/engineer/tickets/${ticket.id}`,
    type: "ASSIGNED",
    ticket_id: ticket.id,
  });
}

export async function notifyStopClock(ticket: {
  id: string;
  ticket_no: string;
  paused: boolean;
  reason?: string | null;
  engineerId?: string | null;
}) {
  const title = ticket.paused
    ? `Stop clock · ${ticket.ticket_no}`
    : `Resume SLA · ${ticket.ticket_no}`;
  const body = ticket.paused
    ? ticket.reason?.slice(0, 120) || "SLA di-pause"
    : "SLA countdown dilanjutkan";

  await notifyRoles([Role.NOC_L0, Role.NOC_L1, Role.ADMIN_NOC, Role.SUPER_ADMIN], {
    title,
    body,
    href: `/admin/tickets/${ticket.id}`,
    type: "STOP_CLOCK",
    ticket_id: ticket.id,
  });

  if (ticket.engineerId) {
    await notifyUser(ticket.engineerId, {
      title,
      body,
      href: `/engineer/tickets/${ticket.id}`,
      type: "STOP_CLOCK",
      ticket_id: ticket.id,
    });
  }
}
