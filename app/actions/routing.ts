"use server";

import { revalidatePath } from "next/cache";
import { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES, NOC_L0_ROLES, NOC_L1_ROLES } from "@/lib/auth";
import { notifyEscalateL1 } from "@/lib/notifications";
import { ticketListInclude } from "@/lib/tickets/service";
import {
  formatHandoverLog,
  l1HandoverSchema,
  type L1HandoverInput,
  type L1HandoverPayload,
} from "@/lib/validations/handover";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

function canL0(role: string) {
  return (NOC_L0_ROLES as readonly string[]).includes(role);
}

function canL1(role: string) {
  return (NOC_L1_ROLES as readonly string[]).includes(role);
}

/** Antrian L0: ticket aktif yang belum di-escalate ke L1 */
export async function getL0RoutingQueue() {
  await requireAdmin();
  return prisma.ticket.findMany({
    where: {
      status: {
        in: [
          TicketStatus.OPEN,
          TicketStatus.ESCALATED,
          TicketStatus.PENDING_SPAREPART,
        ],
      },
      escalated_to_l1_at: null,
    },
    include: ticketListInclude,
    orderBy: [{ priority: "desc" }, { created_at: "asc" }],
    take: 100,
  });
}

/** Antrian L1: menunggu pengecekan device & assign FE */
export async function getL1RoutingQueue() {
  await requireAdmin();
  return prisma.ticket.findMany({
    where: { status: TicketStatus.PENDING_L1 },
    include: ticketListInclude,
    orderBy: [{ escalated_to_l1_at: "asc" }, { created_at: "asc" }],
    take: 100,
  });
}

/**
 * Eskalasi L0 → L1 wajib isi handover: gejala, last ping, aksi remote.
 */
export async function escalateToL1Action(input: {
  ticket_id: string;
  handover: L1HandoverInput;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    if (!canL0(session.user.role)) {
      return { success: false, error: "Hanya L0 / dispatcher yang boleh escalate ke L1" };
    }

    const parsed = l1HandoverSchema.safeParse(input.handover);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Handover tidak lengkap",
      };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };

    if (ticket.status === TicketStatus.PENDING_L1) {
      return { success: false, error: "Ticket sudah di antrian L1" };
    }

    if (
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED
    ) {
      return { success: false, error: "Ticket sudah selesai" };
    }

    const now = new Date();
    const handoverPayload: L1HandoverPayload = {
      symptoms: parsed.data.symptoms.trim(),
      last_ping: parsed.data.last_ping.trim(),
      remote_actions: parsed.data.remote_actions,
      notes: parsed.data.notes?.trim() || null,
      handed_over_at: now.toISOString(),
      handed_over_by: session.user.id,
    };
    const logNotes = formatHandoverLog(parsed.data);

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.PENDING_L1,
          escalated_to_l1_at: now,
          escalated_by_id: session.user.id,
          l1_handover: handoverPayload as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: TicketStatus.PENDING_L1,
          changed_by: session.user.id,
          notes: logNotes,
          photo_url: [],
        },
      });
    });

    void notifyEscalateL1({
      id: ticket.id,
      ticket_no: ticket.ticket_no,
      reason: `Gejala: ${handoverPayload.symptoms.slice(0, 80)}`,
    });

    revalidatePath("/admin/routing");
    revalidatePath("/admin/tickets");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal escalate ke L1",
    };
  }
}

/** L1 claim: mulai handle antrian (opsional notes), status tetap PENDING_L1 sampai assign */
export async function claimL1TicketAction(input: {
  ticket_id: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    if (!canL1(session.user.role)) {
      return { success: false, error: "Hanya L1 yang boleh claim antrian ini" };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.status !== TicketStatus.PENDING_L1) {
      return { success: false, error: "Ticket tidak di antrian L1" };
    }

    await prisma.ticketLog.create({
      data: {
        ticket_id: ticket.id,
        status_from: TicketStatus.PENDING_L1,
        status_to: TicketStatus.PENDING_L1,
        changed_by: session.user.id,
        notes:
          input.notes?.trim() ||
          `L1 ${session.user.name ?? session.user.id} claim & mulai cek device`,
        photo_url: [],
      },
    });

    revalidatePath("/admin/routing");
    revalidatePath(`/admin/tickets/${ticket.id}`);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal claim",
    };
  }
}

export async function getRoutingCounts() {
  await requireAdmin();
  const [l0, l1] = await Promise.all([
    prisma.ticket.count({
      where: {
        status: {
          in: [
            TicketStatus.OPEN,
            TicketStatus.ESCALATED,
            TicketStatus.PENDING_SPAREPART,
          ],
        },
        escalated_to_l1_at: null,
      },
    }),
    prisma.ticket.count({ where: { status: TicketStatus.PENDING_L1 } }),
  ]);
  return { l0, l1 };
}
