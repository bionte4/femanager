"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ComplianceType,
  EngineerStatus,
  TicketStatus,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logCompliance } from "@/app/actions/legal";
import { autoDispatchTicket } from "@/lib/dispatch";
import {
  eligibleForWork,
  eligibilityMessage,
} from "@/lib/eligibility";

const REJECT_REASONS = [
  "Jauh dari lokasi",
  "Ada kerjaan lain",
  "Sakit / tidak fit",
  "Cuaca buruk",
  "Alat tidak lengkap",
  "Lainnya",
] as const;

export { REJECT_REASONS };

async function requireEligibleEngineer() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      trust_score: true,
      role: true,
      engagement_type: true,
    },
  });
  if (!user) throw new Error("Unauthorized");

  const elig = await eligibleForWork(user.id);
  if (!elig.ok) {
    throw new Error(eligibilityMessage(elig.reason));
  }
  return user;
}

export async function acceptJobAction(
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireEligibleEngineer();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.assigned_engineer_id !== user.id) {
      return { success: false, error: "Bukan ticket kamu" };
    }
    if (ticket.status !== TicketStatus.ASSIGNED) {
      return { success: false, error: "Status tidak bisa di-accept" };
    }
    if (ticket.accepted_at) {
      return { success: true };
    }

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          accepted_at: new Date(),
          response_at: ticket.response_at ?? new Date(),
        },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticketId,
          status_from: TicketStatus.ASSIGNED,
          status_to: TicketStatus.ASSIGNED,
          changed_by: user.id,
          notes: "Engineer menerima job (TERIMA JOB)",
          photo_url: [],
        },
      });
    });

    await logCompliance({
      engineer_id: user.id,
      type: ComplianceType.JOB_ACCEPT,
      ticket_id: ticketId,
      metadata: { ip },
    });

    revalidatePath(`/engineer/tickets/${ticketId}`);
    revalidatePath("/engineer/my-tickets");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal accept",
    };
  }
}

export async function rejectJobAction(input: {
  ticket_id: string;
  reason: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireEligibleEngineer();

    // PKWT: hard-block reject — tugas penempatan, bukan job open market
    if (
      user.engagement_type === "PKWT_OUTTASK" ||
      user.engagement_type === "PKWT_INTERNAL"
    ) {
      return {
        success: false,
        error:
          "Karyawan PKWT tidak dapat menolak tugas. Hubungi supervisor/NOC jika berhalangan.",
      };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticket_id },
    });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.assigned_engineer_id !== user.id) {
      return { success: false, error: "Bukan ticket kamu" };
    }
    if (ticket.status !== TicketStatus.ASSIGNED || ticket.accepted_at) {
      return { success: false, error: "Job sudah diterima / status berubah" };
    }

    const reason = input.reason.trim() || "Lainnya";
    // Hanya -1 trust — bukti bebas menolak, tidak suspend
    const newTrust = Math.max(0, Math.round((user.trust_score - 1) * 10) / 10);

    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          assigned_engineer_id: null,
          status: TicketStatus.OPEN,
          accepted_at: null,
          last_assigned_at: null,
          rejected_by: Array.from(
            new Set([...(ticket.rejected_by ?? []), user.id])
          ),
          tried_engineer_ids: Array.from(
            new Set([...(ticket.tried_engineer_ids ?? []), user.id])
          ),
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: EngineerStatus.AVAILABLE,
          trust_score: newTrust,
        },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: TicketStatus.ASSIGNED,
          status_to: TicketStatus.OPEN,
          changed_by: user.id,
          notes: `Engineer menolak job: ${reason}${input.notes ? ` — ${input.notes}` : ""} (trust -1)`,
          photo_url: [],
        },
      });
    });

    await logCompliance({
      engineer_id: user.id,
      type: ComplianceType.JOB_REJECT,
      ticket_id: ticket.id,
      metadata: {
        reason_reject: reason,
        notes: input.notes || null,
        trust_delta: -1,
      },
    });

    // Cek reject berturut-turut — HANYA notif, TIDAK suspend
    const recentRejects = await prisma.complianceLog.findMany({
      where: {
        engineer_id: user.id,
        type: { in: [ComplianceType.JOB_REJECT, ComplianceType.JOB_ACCEPT] },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });
    const fiveRejectsInRow = recentRejects.every(
      (l) => l.type === ComplianceType.JOB_REJECT
    );
    if (fiveRejectsInRow && recentRejects.length >= 5) {
      await logCompliance({
        engineer_id: user.id,
        type: ComplianceType.JOB_REJECT,
        ticket_id: ticket.id,
        metadata: {
          notice: "5x reject berturut — info saja, tidak suspend (bukti bebas)",
        },
      });
    }

    // Re-dispatch ke FE lain
    void autoDispatchTicket(ticket.id);

    revalidatePath(`/engineer/tickets/${ticket.id}`);
    revalidatePath("/engineer/my-tickets");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal reject",
    };
  }
}
