"use server";

import { revalidatePath } from "next/cache";
import { Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ticketDetailInclude } from "@/lib/tickets/service";

async function requireEngineer() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
    throw new Error("Unauthorized");
  }
  return session;
}

const ACTIVE: TicketStatus[] = [
  TicketStatus.ASSIGNED,
  TicketStatus.ON_THE_WAY,
  TicketStatus.ON_SITE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING_SPAREPART,
  TicketStatus.ESCALATED,
];

export async function getMyActiveTickets() {
  const session = await requireEngineer();
  return prisma.ticket.findMany({
    where: {
      assigned_engineer_id: session.user.id,
      status: { in: ACTIVE },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          city: true,
          lat: true,
          lng: true,
        },
      },
      device: {
        select: {
          id: true,
          type: true,
          serial_number: true,
          status: true,
          brand: true,
        },
      },
    },
    orderBy: [{ priority: "desc" }, { sla_due_at: "asc" }],
  });
}

export async function getMyHistoryTickets() {
  const session = await requireEngineer();
  return prisma.ticket.findMany({
    where: {
      assigned_engineer_id: session.user.id,
      status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
    },
    include: {
      tenant: { select: { name: true, code: true, city: true } },
      device: { select: { type: true, serial_number: true } },
    },
    orderBy: { resolved_at: "desc" },
    take: 50,
  });
}

export async function getMyTicketById(id: string) {
  const session = await requireEngineer();
  const ticket = await prisma.ticket.findFirst({
    where: {
      id,
      assigned_engineer_id: session.user.id,
    },
    include: ticketDetailInclude,
  });
  return ticket;
}

/** Update posisi GPS engineer di profil */
export async function updateEngineerLocation(lat: number, lng: number) {
  const session = await requireEngineer();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { lat, lng },
  });
  revalidatePath("/engineer/my-tickets");
  return { success: true as const };
}
