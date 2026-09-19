import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WORKLOAD,
  getWorkloadSettings,
  type WorkloadSettings,
} from "@/lib/app-settings";

/** Status ticket yang dihitung sebagai beban aktif engineer */
export const WORKLOAD_ACTIVE_STATUSES: TicketStatus[] = [
  TicketStatus.ASSIGNED,
  TicketStatus.ON_THE_WAY,
  TicketStatus.ON_SITE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING_SPAREPART,
  TicketStatus.PENDING_L1,
  TicketStatus.PENDING_REVIEW,
  TicketStatus.ESCALATED,
];

export type EngineerWorkload = {
  engineer_id: string;
  active_count: number;
  load_minutes: number;
  /** Melewati hard/soft cap */
  blocked: boolean;
  warned: boolean;
  max_active: number;
  max_load: number;
  warn_load: number;
};

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Beban aktif per engineer: jumlah ticket + sum estimasi menit kategori.
 */
export async function getEngineersWorkload(
  engineerIds: string[],
  opts?: {
    /** Ticket yang diabaikan (mis. ticket yang sedang di-reassign) */
    excludeTicketId?: string;
    settings?: WorkloadSettings;
  }
): Promise<Map<string, EngineerWorkload>> {
  const settings = opts?.settings ?? (await getWorkloadSettings());
  const map = new Map<string, EngineerWorkload>();

  for (const id of engineerIds) {
    map.set(id, {
      engineer_id: id,
      active_count: 0,
      load_minutes: 0,
      blocked: false,
      warned: false,
      max_active: settings.max_active_tickets,
      max_load: settings.max_load_minutes,
      warn_load: settings.warn_load_minutes,
    });
  }

  if (engineerIds.length === 0) return map;

  const tickets = await prisma.ticket.findMany({
    where: {
      assigned_engineer_id: { in: engineerIds },
      status: { in: WORKLOAD_ACTIVE_STATUSES },
      ...(opts?.excludeTicketId
        ? { id: { not: opts.excludeTicketId } }
        : {}),
    },
    select: {
      assigned_engineer_id: true,
      service_category: { select: { estimated_duration_minutes: true } },
      service_package: { select: { estimated_duration: true } },
    },
  });

  for (const t of tickets) {
    const engId = t.assigned_engineer_id;
    if (!engId) continue;
    const row = map.get(engId);
    if (!row) continue;
    row.active_count += 1;
    const est =
      t.service_package?.estimated_duration ??
      t.service_category?.estimated_duration_minutes ??
      60;
    row.load_minutes += clampInt(est, 1, 24 * 60, 60);
  }

  for (const row of map.values()) {
    if (!settings.enabled) {
      row.blocked = false;
      row.warned = false;
      continue;
    }
    row.blocked =
      row.active_count >= settings.max_active_tickets ||
      row.load_minutes >= settings.max_load_minutes;
    row.warned =
      !row.blocked && row.load_minutes >= settings.warn_load_minutes;
  }

  return map;
}

export async function getEngineerWorkload(
  engineerId: string,
  opts?: { excludeTicketId?: string; settings?: WorkloadSettings }
): Promise<EngineerWorkload> {
  const map = await getEngineersWorkload([engineerId], opts);
  return (
    map.get(engineerId) ?? {
      engineer_id: engineerId,
      active_count: 0,
      load_minutes: 0,
      blocked: false,
      warned: false,
      max_active: DEFAULT_WORKLOAD.max_active_tickets,
      max_load: DEFAULT_WORKLOAD.max_load_minutes,
      warn_load: DEFAULT_WORKLOAD.warn_load_minutes,
    }
  );
}

export type WorkloadCheckResult =
  | { ok: true; workload: EngineerWorkload }
  | { ok: false; error: string; workload: EngineerWorkload };

/**
 * Cek apakah engineer boleh menerima ticket tambahan.
 * @param extraLoadMinutes estimasi ticket baru (default 60)
 */
export async function assertEngineerCanTakeTicket(
  engineerId: string,
  opts?: {
    excludeTicketId?: string;
    extraLoadMinutes?: number;
    /** Override admin (skip guard) */
    override?: boolean;
  }
): Promise<WorkloadCheckResult> {
  const settings = await getWorkloadSettings();
  const workload = await getEngineerWorkload(engineerId, {
    excludeTicketId: opts?.excludeTicketId,
    settings,
  });

  if (!settings.enabled || opts?.override) {
    return { ok: true, workload };
  }

  const extra = clampInt(opts?.extraLoadMinutes ?? 60, 0, 24 * 60, 60);
  const nextCount = workload.active_count + 1;
  const nextLoad = workload.load_minutes + extra;

  if (nextCount > settings.max_active_tickets) {
    return {
      ok: false,
      workload,
      error: `Workload Guard: engineer sudah punya ${workload.active_count} ticket aktif (max ${settings.max_active_tickets}). Selesaikan dulu atau naikkan batas di Integrations.`,
    };
  }
  if (nextLoad > settings.max_load_minutes) {
    return {
      ok: false,
      workload,
      error: `Workload Guard: beban ~${nextLoad} mnt melebihi max ${settings.max_load_minutes} mnt (saat ini ${workload.load_minutes} + ticket ~${extra}).`,
    };
  }

  return { ok: true, workload };
}

/** Filter daftar kandidat dispatch yang masih muat beban */
export async function filterEngineersByWorkload<T extends { id: string }>(
  candidates: T[],
  opts?: {
    excludeTicketId?: string;
    extraLoadMinutes?: number;
  }
): Promise<T[]> {
  const settings = await getWorkloadSettings();
  if (!settings.enabled || candidates.length === 0) return candidates;

  const workloads = await getEngineersWorkload(
    candidates.map((c) => c.id),
    { excludeTicketId: opts?.excludeTicketId, settings }
  );
  const extra = clampInt(opts?.extraLoadMinutes ?? 60, 0, 24 * 60, 60);

  return candidates.filter((c) => {
    const w = workloads.get(c.id);
    if (!w) return true;
    if (w.active_count + 1 > settings.max_active_tickets) return false;
    if (w.load_minutes + extra > settings.max_load_minutes) return false;
    return true;
  });
}

export async function estimateTicketLoadMinutes(
  ticketId: string
): Promise<number> {
  const t = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      service_category: { select: { estimated_duration_minutes: true } },
      service_package: { select: { estimated_duration: true } },
    },
  });
  return clampInt(
    t?.service_package?.estimated_duration ??
      t?.service_category?.estimated_duration_minutes ??
      60,
    1,
    24 * 60,
    60
  );
}
