import {
  DeviceType,
  EngineerStatus,
  Role,
  TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sortByHaversineDistance } from "@/lib/haversine";
import {
  buildDispatchMessage,
  buildReassignMessage,
  sendWhatsApp,
} from "@/lib/whatsapp";
import {
  categoryCodeForDeviceType,
  engineerHasSkill,
  getActiveCertifiedEngineerIds,
  skillAliasesForCategory,
} from "@/lib/skill-match";

export { categoryCodeForDeviceType } from "@/lib/skill-match";

export type NearbyEngineer = {
  id: string;
  full_name: string;
  phone: string;
  lat: number;
  lng: number;
  skills: string[];
  trust_score: number;
  distance_meters: number;
};

/** @deprecated gunakan categoryCodeForDeviceType */
export function skillForDeviceType(type: DeviceType | null | undefined): string | null {
  return categoryCodeForDeviceType(type);
}

type FindNearbyParams = {
  tenantLat: number;
  tenantLng: number;
  categoryCode?: string | null;
  requiresCertification?: boolean;
  preferToolkit?: boolean;
  excludeIds?: string[];
  limit?: number;
};

/**
 * Cari engineer cocok untuk ticket berdasarkan ServiceCategory
 */
export async function findEngineersForTicket(params: {
  tenantLat: number;
  tenantLng: number;
  categoryCode: string | null;
  requiresCertification: boolean;
  preferToolkit: boolean;
  excludeIds?: string[];
  limit?: number;
}): Promise<NearbyEngineer[]> {
  return findNearbyEngineers({
    tenantLat: params.tenantLat,
    tenantLng: params.tenantLng,
    categoryCode: params.categoryCode,
    requiresCertification: params.requiresCertification,
    preferToolkit: params.preferToolkit,
    excludeIds: params.excludeIds,
    limit: params.limit ?? 5,
  });
}

export async function findNearbyEngineers(
  params: FindNearbyParams
): Promise<NearbyEngineer[]> {
  const limit = params.limit ?? 5;
  const excludeIds = params.excludeIds ?? [];

  const engineers = await prisma.user.findMany({
    where: {
      role: Role.FIELD_ENGINEER,
      status: EngineerStatus.AVAILABLE,
      is_suspended: false,
      is_coordinator: false,
      lat: { not: null },
      lng: { not: null },
      id: excludeIds.length ? { notIn: excludeIds } : undefined,
    },
    select: {
      id: true,
      full_name: true,
      phone: true,
      lat: true,
      lng: true,
      skills: true,
      trust_score: true,
      has_motorcycle: true,
      has_toolkit: true,
    },
  });

  // Filter skill ketat (termasuk alias EDC/LAN/WAN ↔ category code)
  let list = params.categoryCode
    ? engineers.filter((e) => engineerHasSkill(e.skills, params.categoryCode))
    : engineers;

  if (params.requiresCertification && params.categoryCode) {
    const certified = await getActiveCertifiedEngineerIds({
      engineerIds: list.map((e) => e.id),
      categoryCode: params.categoryCode,
    });
    list = list.filter((e) => certified.has(e.id));

    if (params.categoryCode.toUpperCase() === "SDWAN") {
      list = list.filter((e) => e.trust_score > 85);
    }
  }

  // Prioritas motor+toolkit untuk CCTV/WIFI/LAPTOP
  if (params.preferToolkit) {
    list = [...list].sort((a, b) => {
      const score = (e: (typeof list)[0]) =>
        (e.has_motorcycle ? 2 : 0) + (e.has_toolkit ? 2 : 0);
      return score(b) - score(a);
    });
  }

  const sorted = sortByHaversineDistance(
    list,
    params.tenantLat,
    params.tenantLng
  );

  // Tie-break: trust_score
  sorted.sort((a, b) => {
    const d = a.distance_meters - b.distance_meters;
    if (Math.abs(d) < 500) return b.trust_score - a.trust_score;
    return d;
  });

  return sorted.slice(0, limit).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    phone: e.phone,
    lat: e.lat as number,
    lng: e.lng as number,
    skills: e.skills,
    trust_score: e.trust_score,
    distance_meters: e.distance_meters,
  }));
}

/** Filter SDWAN legacy (cert aktif + trust + alias skill) */
export async function filterSdwanEligibleEngineers(
  engineerIds: string[]
): Promise<string[]> {
  if (engineerIds.length === 0) return [];
  const certified = await getActiveCertifiedEngineerIds({
    engineerIds,
    categoryCode: "SDWAN",
  });
  const users = await prisma.user.findMany({
    where: {
      id: { in: engineerIds.filter((id) => certified.has(id)) },
      trust_score: { gt: 85 },
    },
    select: { id: true, skills: true },
  });
  return users
    .filter((u) => engineerHasSkill(u.skills, "SDWAN"))
    .map((u) => u.id);
}

export type DispatchResult = {
  success: boolean;
  ticket_id: string;
  engineer?: NearbyEngineer;
  attempt?: number;
  escalated?: boolean;
  error?: string;
};

/**
 * Auto Dispatch Engine — assign engineer terdekat cocok kategori
 */
export async function autoDispatchTicket(
  ticketId: string,
  options?: { isReassign?: boolean }
): Promise<DispatchResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: true,
      device: { include: { service_category: true } },
      service_category: true,
      service_package: true,
      assigned_engineer: true,
    },
  });

  if (!ticket) {
    return { success: false, ticket_id: ticketId, error: "Ticket tidak ditemukan" };
  }

  if (ticket.accepted_at) {
    return {
      success: false,
      ticket_id: ticketId,
      error: "Ticket sudah di-accept engineer",
    };
  }

  const isFirst = !options?.isReassign && ticket.status === TicketStatus.OPEN;
  const isReassign =
    !!options?.isReassign && ticket.status === TicketStatus.ASSIGNED;

  if (!isFirst && !isReassign) {
    return {
      success: false,
      ticket_id: ticketId,
      error: `Status ${ticket.status} tidak bisa di-dispatch`,
    };
  }

  const category =
    ticket.service_category ??
    ticket.device?.service_category ??
    null;
  const categoryCode =
    category?.code ??
    categoryCodeForDeviceType(ticket.device?.type) ??
    null;
  const requiresCert =
    category?.requires_certification === true || categoryCode === "SDWAN";
  const preferToolkit = ["CCTV", "WIFI", "LAPTOP"].includes(categoryCode ?? "");

  const triedEngineerIds = ticket.tried_engineer_ids ?? [];
  const excludeForReassign = Array.from(
    new Set([
      ...triedEngineerIds,
      ...(ticket.assigned_engineer_id ? [ticket.assigned_engineer_id] : []),
    ])
  );

  const requiredEngineers = Math.max(
    1,
    ticket.required_engineers ||
      ticket.service_package?.required_engineers ||
      1
  );

  const nearby = await findEngineersForTicket({
    tenantLat: ticket.tenant.lat,
    tenantLng: ticket.tenant.lng,
    categoryCode,
    requiresCertification: requiresCert,
    preferToolkit,
    excludeIds: isReassign ? excludeForReassign : triedEngineerIds,
    limit: Math.max(5, requiredEngineers + 2),
  });

  if (nearby.length === 0) {
    const aliasHint = categoryCode
      ? ` skill ∈ [${skillAliasesForCategory(categoryCode).join(", ")}]`
      : "";
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.ESCALATED },
      });
      await tx.ticketLog.create({
        data: {
          ticket_id: ticket.id,
          status_from: ticket.status,
          status_to: TicketStatus.ESCALATED,
          notes: categoryCode
            ? `Auto-dispatch gagal: tidak ada FE${aliasHint}${requiresCert ? " + sertifikasi aktif" : ""} di dekat lokasi`
            : "Auto-dispatch gagal: tidak ada engineer AVAILABLE di dekat lokasi",
          photo_url: [],
        },
      });
    });

    void import("@/lib/webhook").then(({ triggerExternalWebhook }) =>
      triggerExternalWebhook(ticket.id, TicketStatus.ESCALATED)
    );

    return {
      success: false,
      ticket_id: ticketId,
      escalated: true,
      error: "Tidak ada engineer tersedia",
    };
  }

  const engineer = nearby[0];
  const attempt = (ticket.dispatch_attempts ?? 0) + 1;
  const now = new Date();
  const tried = Array.from(new Set([...triedEngineerIds, engineer.id]));

  await prisma.$transaction(async (tx) => {
    if (
      ticket.assigned_engineer_id &&
      ticket.assigned_engineer_id !== engineer.id
    ) {
      await tx.user.update({
        where: { id: ticket.assigned_engineer_id },
        data: { status: EngineerStatus.AVAILABLE },
      });
    }

    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        assigned_engineer_id: engineer.id,
        status: TicketStatus.ASSIGNED,
        dispatch_attempts: attempt,
        last_assigned_at: now,
        accepted_at: null,
        tried_engineer_ids: tried,
        response_at: ticket.response_at ?? now,
        service_category_id:
          ticket.service_category_id ??
          category?.id ??
          ticket.device?.service_category_id ??
          null,
      },
    });

    await tx.user.update({
      where: { id: engineer.id },
      data: { status: EngineerStatus.BUSY },
    });

    await tx.ticketLog.create({
      data: {
        ticket_id: ticket.id,
        status_from: ticket.status,
        status_to: TicketStatus.ASSIGNED,
        notes: isReassign
          ? `Auto re-assign #${attempt} ke ${engineer.full_name} (${Math.round(engineer.distance_meters)}m)`
          : `Auto-dispatch ke ${engineer.full_name} (${Math.round(engineer.distance_meters)}m)${categoryCode ? ` · ${categoryCode}` : ""}${requiresCert ? " · cert OK" : ""}${requiredEngineers > 1 ? ` · butuh ${requiredEngineers} FE` : ""}`,
        photo_url: [],
      },
    });
  });

  const message = isReassign
    ? buildReassignMessage(ticket.ticket_no, ticket.tenant.name, attempt)
    : buildDispatchMessage(ticket.ticket_no, ticket.tenant.name);

  await sendWhatsApp({ phone: engineer.phone, message });

  // Paket besar: notify FE tambahan sebagai helper (primary tetap nearby[0])
  if (requiredEngineers > 1) {
    const helpers = nearby.slice(1, requiredEngineers);
    for (const helper of helpers) {
      await sendWhatsApp({
        phone: helper.phone,
        message: `[FE-Track] Ticket ${ticket.ticket_no} butuh ${requiredEngineers} orang. Primary: ${engineer.full_name}. Lokasi: ${ticket.tenant.name}. Hubungi dispatcher jika siap bantu.`,
      });
    }
  }

  return {
    success: true,
    ticket_id: ticketId,
    engineer,
    attempt,
  };
}

/** Timeout accept job sebelum auto re-assign (cron + UI countdown) */
export const ACCEPT_TIMEOUT_MS = 15 * 60 * 1000;

export function getAcceptDeadline(lastAssignedAt: Date | string): Date {
  const start =
    typeof lastAssignedAt === "string"
      ? new Date(lastAssignedAt)
      : lastAssignedAt;
  return new Date(start.getTime() + ACCEPT_TIMEOUT_MS);
}

/**
 * Cron: ticket ASSIGNED belum accept >15 menit → log TIMEOUT + re-dispatch
 */
export async function processDispatchTimeouts(): Promise<{
  checked: number;
  reassigned: number;
  escalated: number;
}> {
  const cutoff = new Date(Date.now() - ACCEPT_TIMEOUT_MS);
  const stale = await prisma.ticket.findMany({
    where: {
      status: TicketStatus.ASSIGNED,
      accepted_at: null,
      last_assigned_at: { lte: cutoff },
    },
    select: { id: true, assigned_engineer_id: true },
    take: 50,
  });

  let reassigned = 0;
  let escalated = 0;

  for (const t of stale) {
    if (t.assigned_engineer_id) {
      await prisma.complianceLog.create({
        data: {
          engineer_id: t.assigned_engineer_id,
          type: "JOB_TIMEOUT",
          ticket_id: t.id,
          metadata: { timeout_minutes: 15 },
        },
      });
    }
    const result = await autoDispatchTicket(t.id, { isReassign: true });
    if (result.success) reassigned += 1;
    else if (result.escalated) escalated += 1;
  }

  return { checked: stale.length, reassigned, escalated };
}
