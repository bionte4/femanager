import { Priority, TicketStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const listInclude = {
  tenant: { select: { id: true, name: true, code: true, city: true, sla_tier: true } },
  device: {
    select: {
      id: true,
      type: true,
      serial_number: true,
      status: true,
      service_category_id: true,
    },
  },
  service_category: {
    select: { id: true, code: true, name: true, icon: true, estimated_duration_minutes: true },
  },
  service_package: {
    select: { id: true, name: true, fee_engineer: true, price_customer: true },
  },
  assigned_engineer: {
    select: { id: true, full_name: true, phone: true, status: true },
  },
} satisfies Prisma.TicketInclude;

const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.ON_THE_WAY,
  TicketStatus.ON_SITE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING_SPAREPART,
  TicketStatus.ESCALATED,
  TicketStatus.PENDING_L1,
  TicketStatus.PENDING_REVIEW,
];

const PRIORITY_RANK: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export type MergeCandidate = Prisma.TicketGetPayload<{
  include: typeof listInclude;
}>;

/**
 * Cari ticket aktif yang bisa digabung (device sama, atau tenant tanpa device dalam 2 jam).
 */
export async function findDuplicateOpenTicket(params: {
  tenant_id: string;
  device_id?: string | null;
}): Promise<MergeCandidate | null> {
  if (params.device_id) {
    return prisma.ticket.findFirst({
      where: {
        device_id: params.device_id,
        status: { in: OPEN_STATUSES },
      },
      include: listInclude,
      orderBy: { created_at: "asc" },
    });
  }

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return prisma.ticket.findFirst({
    where: {
      tenant_id: params.tenant_id,
      device_id: null,
      status: {
        in: [TicketStatus.OPEN, TicketStatus.ESCALATED, TicketStatus.PENDING_L1],
      },
      created_at: { gte: since },
    },
    include: listInclude,
    orderBy: { created_at: "asc" },
  });
}

/**
 * Gabungkan alert baru ke ticket existing: log + optional bump priority.
 */
export async function mergeAlertIntoTicket(params: {
  existing: MergeCandidate;
  description: string;
  priority?: Priority;
  reported_by?: string | null;
  source?: string | null;
  changed_by?: string | null;
}): Promise<MergeCandidate> {
  const { existing } = params;
  const now = new Date();
  const bump =
    params.priority &&
    PRIORITY_RANK[params.priority] > PRIORITY_RANK[existing.priority]
      ? params.priority
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: existing.id },
      data: {
        ...(bump ? { priority: bump } : {}),
        updated_at: now,
      },
    });

    await tx.ticketLog.create({
      data: {
        ticket_id: existing.id,
        status_from: existing.status,
        status_to: existing.status,
        changed_by: params.changed_by || null,
        notes: [
          "DUPLICATE MERGE",
          params.source ? `source=${params.source}` : null,
          params.reported_by ? `by=${params.reported_by}` : null,
          bump ? `priority→${bump}` : null,
          params.description.slice(0, 400),
        ]
          .filter(Boolean)
          .join(" | "),
        photo_url: [],
      },
    });
  });

  const refreshed = await prisma.ticket.findUnique({
    where: { id: existing.id },
    include: listInclude,
  });

  return refreshed ?? existing;
}
