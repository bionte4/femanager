"use server";

import { revalidatePath } from "next/cache";
import {
  FraudSeverity,
  FraudType,
  Role,
  TicketStatus,
} from "@prisma/client";
import { requireMasterAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  return requireMasterAdmin();
}

export async function getFraudKpis() {
  await requireAdmin();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [flagsToday, suspended, photoDup, avgTrust] = await Promise.all([
    prisma.fraudLog.count({ where: { created_at: { gte: start } } }),
    prisma.user.count({
      where: { role: Role.FIELD_ENGINEER, is_suspended: true },
    }),
    prisma.fraudLog.count({
      where: {
        type: FraudType.PHOTO_DUPLICATE,
        created_at: { gte: start },
      },
    }),
    prisma.user.aggregate({
      where: { role: Role.FIELD_ENGINEER },
      _avg: { trust_score: true },
    }),
  ]);

  return {
    flags_today: flagsToday,
    suspended,
    photo_duplicate_today: photoDup,
    avg_trust_score: Math.round((avgTrust._avg.trust_score ?? 100) * 10) / 10,
  };
}

export async function getFraudLogs(params?: {
  severity?: FraudSeverity;
  type?: FraudType;
  from?: string;
  to?: string;
}) {
  await requireAdmin();
  const where: {
    severity?: FraudSeverity;
    type?: FraudType;
    created_at?: { gte?: Date; lte?: Date };
  } = {};
  if (params?.severity) where.severity = params.severity;
  if (params?.type) where.type = params.type;
  if (params?.from || params?.to) {
    where.created_at = {};
    if (params.from) where.created_at.gte = new Date(params.from);
    if (params.to) where.created_at.lte = new Date(params.to);
  }

  const logs = await prisma.fraudLog.findMany({
    where,
    include: {
      engineer: { select: { id: true, full_name: true, phone: true } },
      ticket: { select: { id: true, ticket_no: true, status: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  return logs.map((l) => ({
    id: l.id,
    type: l.type,
    severity: l.severity,
    description: l.description,
    metadata: l.metadata as Record<string, unknown> | null,
    is_resolved: l.is_resolved,
    created_at: l.created_at.toISOString(),
    engineer_id: l.engineer_id,
    engineer_name: l.engineer.full_name,
    ticket_id: l.ticket_id,
    ticket_no: l.ticket.ticket_no,
    ticket_status: l.ticket.status,
  }));
}

export async function getPendingReviewTickets() {
  await requireAdmin();
  const tickets = await prisma.ticket.findMany({
    where: { status: TicketStatus.PENDING_REVIEW },
    include: {
      tenant: { select: { name: true, code: true, lat: true, lng: true } },
      assigned_engineer: {
        select: { id: true, full_name: true, phone: true, trust_score: true },
      },
      rating: true,
      fraud_logs: { orderBy: { created_at: "desc" } },
      logs: {
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          status_to: true,
          notes: true,
          lat: true,
          lng: true,
          photo_url: true,
          photo_hash: true,
          exif_lat: true,
          exif_lng: true,
          created_at: true,
        },
      },
    },
    orderBy: { updated_at: "desc" },
    take: 50,
  });

  return tickets.map((t) => ({
    id: t.id,
    ticket_no: t.ticket_no,
    description: t.description,
    tenant_name: t.tenant.name,
    tenant_code: t.tenant.code,
    tenant_lat: t.tenant.lat,
    tenant_lng: t.tenant.lng,
    engineer_id: t.assigned_engineer?.id ?? null,
    engineer_name: t.assigned_engineer?.full_name ?? "—",
    engineer_phone: t.assigned_engineer?.phone ?? "",
    trust_score: t.assigned_engineer?.trust_score ?? 100,
    system_score: t.rating?.system_score ?? null,
    fraud_flags: t.rating?.fraud_flags ?? [],
    fraud_logs: t.fraud_logs.map((f) => ({
      id: f.id,
      type: f.type,
      severity: f.severity,
      description: f.description,
      metadata: f.metadata as Record<string, unknown> | null,
    })),
    photos: t.logs.flatMap((l) => l.photo_url),
    logs: t.logs.map((l) => ({
      ...l,
      created_at: l.created_at.toISOString(),
    })),
    created_at: t.created_at.toISOString(),
  }));
}

export async function getEngineerTrustList() {
  await requireAdmin();
  const engineers = await prisma.user.findMany({
    where: { role: Role.FIELD_ENGINEER },
    select: {
      id: true,
      full_name: true,
      phone: true,
      city: true,
      trust_score: true,
      is_suspended: true,
      suspended_reason: true,
      fraud_logs: { select: { severity: true } },
    },
    orderBy: { trust_score: "asc" },
  });

  return engineers.map((e) => {
    const high = e.fraud_logs.filter((f) => f.severity === "HIGH").length;
    const medium = e.fraud_logs.filter((f) => f.severity === "MEDIUM").length;
    const low = e.fraud_logs.filter((f) => f.severity === "LOW").length;
    return {
      id: e.id,
      full_name: e.full_name,
      phone: e.phone,
      city: e.city,
      trust_score: e.trust_score,
      is_suspended: e.is_suspended,
      suspended_reason: e.suspended_reason,
      fraud_high: high,
      fraud_medium: medium,
      fraud_low: low,
    };
  });
}

/** Approve fraud log = bukan fraud (false positive) */
export async function resolveFraudLogAction(
  logId: string,
  confirmFraud: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const log = await prisma.fraudLog.findUnique({
      where: { id: logId },
      include: { ticket: true },
    });
    if (!log) return { success: false, error: "Fraud log tidak ditemukan" };

    await prisma.fraudLog.update({
      where: { id: logId },
      data: { is_resolved: true },
    });

    if (confirmFraud) {
      await prisma.user.update({
        where: { id: log.engineer_id },
        data: {
          is_suspended: true,
          suspended_reason: `Confirmed fraud: ${log.type} pada ${log.ticket.ticket_no}`,
          status: "OFFLINE",
        },
      });
    }

    revalidatePath("/admin/fraud-center");
    revalidatePath("/admin/engineers");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal resolve fraud",
    };
  }
}

/**
 * Approve PENDING_REVIEW → RESOLVED + bayar komisi
 */
export async function approvePendingReviewAction(
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.status !== TicketStatus.PENDING_REVIEW) {
      return { success: false, error: "Status bukan PENDING_REVIEW" };
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.RESOLVED },
    });
    await prisma.ticketLog.create({
      data: {
        ticket_id: ticketId,
        status_from: TicketStatus.PENDING_REVIEW,
        status_to: TicketStatus.RESOLVED,
        changed_by: session.user.id,
        notes: "Admin approve anti-fraud review — komisi dibayar",
        photo_url: [],
      },
    });

    // Tandai fraud logs resolved (false positive / diterima)
    await prisma.fraudLog.updateMany({
      where: { ticket_id: ticketId, is_resolved: false },
      data: { is_resolved: true },
    });

    const { processCommissionForTicket } = await import("@/lib/commission");
    await processCommissionForTicket(ticketId);

    const { recalculateLeaderboard } = await import("@/lib/leaderboard");
    void recalculateLeaderboard("month");
    void recalculateLeaderboard("all_time");

    revalidatePath("/admin/fraud-center");
    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath("/admin/payroll");
    revalidatePath("/admin/leaderboard");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal approve review",
    };
  }
}

/**
 * Reject PENDING_REVIEW → suspend engineer, komisi tetap ditahan, ticket CLOSED
 */
export async function rejectPendingReviewAction(
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };
    if (ticket.status !== TicketStatus.PENDING_REVIEW) {
      return { success: false, error: "Status bukan PENDING_REVIEW" };
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CLOSED },
    });
    await prisma.ticketLog.create({
      data: {
        ticket_id: ticketId,
        status_from: TicketStatus.PENDING_REVIEW,
        status_to: TicketStatus.CLOSED,
        changed_by: session.user.id,
        notes: "Admin reject anti-fraud — komisi ditahan, engineer di-suspend",
        photo_url: [],
      },
    });

    await prisma.fraudLog.updateMany({
      where: { ticket_id: ticketId },
      data: { is_resolved: true },
    });

    if (ticket.assigned_engineer_id) {
      await prisma.user.update({
        where: { id: ticket.assigned_engineer_id },
        data: {
          is_suspended: true,
          suspended_reason: `Fraud confirmed pada ticket ${ticket.ticket_no}`,
          status: "OFFLINE",
        },
      });
    }

    revalidatePath("/admin/fraud-center");
    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath("/admin/engineers");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal reject review",
    };
  }
}

export async function setEngineerSuspendAction(
  engineerId: string,
  suspend: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.user.update({
      where: { id: engineerId },
      data: {
        is_suspended: suspend,
        suspended_reason: suspend
          ? reason || "Suspended oleh admin"
          : null,
        status: suspend ? "OFFLINE" : undefined,
      },
    });
    revalidatePath("/admin/fraud-center");
    revalidatePath("/admin/engineers");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal update suspend",
    };
  }
}

export async function resetTrustScoreAction(
  engineerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.user.update({
      where: { id: engineerId },
      data: { trust_score: 100 },
    });
    revalidatePath("/admin/fraud-center");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal reset trust",
    };
  }
}
