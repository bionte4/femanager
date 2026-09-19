import { type EngagementType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ExpireContractsResult = {
  expired_count: number;
  employment_ended_count: number;
  contract_ids: string[];
};

/**
 * Cron harian: kontrak ACTIVE dengan end_at < now → EXPIRED.
 * Jika user tidak punya kontrak ACTIVE lain → employment_status = ENDED.
 */
export async function expireEngineerContracts(): Promise<ExpireContractsResult> {
  const now = new Date();

  const due = await prisma.engineerContract.findMany({
    where: {
      status: "ACTIVE",
      end_at: { lt: now },
    },
    select: { id: true, user_id: true },
  });

  if (due.length === 0) {
    return {
      expired_count: 0,
      employment_ended_count: 0,
      contract_ids: [],
    };
  }

  const contractIds = due.map((c) => c.id);
  const userIds = Array.from(new Set(due.map((c) => c.user_id)));

  await prisma.engineerContract.updateMany({
    where: { id: { in: contractIds } },
    data: { status: "EXPIRED" },
  });

  let employmentEnded = 0;
  for (const userId of userIds) {
    const stillActive = await prisma.engineerContract.findFirst({
      where: {
        user_id: userId,
        status: "ACTIVE",
        end_at: { gte: now },
      },
      select: { id: true },
    });
    if (stillActive) continue;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { engagement_type: true, employment_status: true },
    });
    if (!user) continue;
    if (user.engagement_type === "MITRA" || user.employment_status === "ENDED") {
      continue;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { employment_status: "ENDED" },
    });
    employmentEnded += 1;
  }

  return {
    expired_count: contractIds.length,
    employment_ended_count: employmentEnded,
    contract_ids: contractIds,
  };
}

export async function listExpiringContracts(withinDays = 30) {
  const now = new Date();
  const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return prisma.engineerContract.findMany({
    where: {
      status: "ACTIVE",
      end_at: { gte: now, lte: until },
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          city: true,
          engagement_type: true,
          employment_status: true,
        },
      },
    },
    orderBy: { end_at: "asc" },
  });
}

export type RemindContractsResult = {
  reminded_engineers: number;
  reminded_admin: boolean;
  contract_ids: string[];
  days_matched: number[];
};

/**
 * Cron harian: WA ke engineer + ringkasan admin saat sisa hari tepat 30/14/7/3.
 * (Exact-day agar tidak spam tiap hari dalam window.)
 */
export async function remindExpiringContracts(
  remindDays: number[] = [30, 14, 7, 3]
): Promise<RemindContractsResult> {
  const { sendWhatsApp } = await import("@/lib/whatsapp");
  const now = new Date();
  const maxDays = Math.max(...remindDays, 1);
  const until = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

  const contracts = await prisma.engineerContract.findMany({
    where: {
      status: "ACTIVE",
      end_at: { gte: now, lte: until },
    },
    include: {
      user: {
        select: { id: true, full_name: true, phone: true },
      },
    },
  });

  const matched: {
    id: string;
    days: number;
    full_name: string;
    phone: string;
    type: string;
    client_label: string | null;
    end_at: Date;
  }[] = [];

  for (const c of contracts) {
    const days = Math.ceil(
      (c.end_at.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (!remindDays.includes(days)) continue;
    matched.push({
      id: c.id,
      days,
      full_name: c.user.full_name,
      phone: c.user.phone,
      type: c.type,
      client_label: c.client_label,
      end_at: c.end_at,
    });
  }

  let remindedEngineers = 0;
  for (const m of matched) {
    const endLabel = m.end_at.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const res = await sendWhatsApp({
      phone: m.phone,
      message:
        `Pengingat kontrak PKWT FE-Track: berakhir dalam ${m.days} hari (${endLabel}).` +
        (m.client_label ? ` Client: ${m.client_label}.` : "") +
        ` Hubungi HR/admin untuk perpanjang jika masih aktif.`,
    });
    if (res.success) remindedEngineers += 1;
  }

  let remindedAdmin = false;
  if (matched.length > 0) {
    const lines = matched
      .slice(0, 15)
      .map((m) => `${m.full_name} (${m.days}h)`)
      .join(", ");
    const { notifyAdmin } = await import("@/lib/notify");
    const res = await notifyAdmin(
      `FE-Track: ${matched.length} kontrak PKWT hampir expired (hari 30/14/7/3). ${lines}. Cek /admin/hr/contracts`
    );
    remindedAdmin =
      (res.whatsapp.success && !res.whatsapp.skipped) ||
      (res.telegram.success && !res.telegram.skipped);
  }

  return {
    reminded_engineers: remindedEngineers,
    reminded_admin: remindedAdmin,
    contract_ids: matched.map((m) => m.id),
    days_matched: remindDays,
  };
}

export function contractTypeToEngagement(
  type: "PKWT_OUTTASK" | "PKWT_INTERNAL" | string
): EngagementType {
  return type === "PKWT_INTERNAL" ? "PKWT_INTERNAL" : "PKWT_OUTTASK";
}

export function parseCities(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((c) => c.trim()).filter(Boolean);
  }
  return raw
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export type PlacementContract = {
  placement_cities: string[];
  placement_tenant_ids: string[];
  client_label?: string | null;
};

export type PlacementTenant = {
  id: string;
  city: string;
  name?: string | null;
};

/**
 * Fase 1 placement: tenant_ids ketat, lalu cities[].
 * Tanpa batasan → boleh semua kota. client_label hanya label admin (bukan filter keras).
 */
export function matchesPlacement(
  contract: PlacementContract,
  tenant: PlacementTenant
): boolean {
  const tenantIds = contract.placement_tenant_ids ?? [];
  if (tenantIds.length > 0) {
    return tenantIds.includes(tenant.id);
  }

  const cities = contract.placement_cities ?? [];
  if (cities.length > 0) {
    const city = tenant.city.trim().toLowerCase();
    return cities.some((c) => c.trim().toLowerCase() === city);
  }

  return true;
}

/** Prisma where: FE eligible untuk dispatch (Mitra signed ATAU PKWT + kontrak aktif) */
export function dispatchEligibleWhere(
  now = new Date()
): Prisma.UserWhereInput {
  return {
    role: "FIELD_ENGINEER",
    is_suspended: false,
    OR: [
      {
        engagement_type: "MITRA",
        partnership_status: "SIGNED",
      },
      {
        engagement_type: { in: ["PKWT_OUTTASK", "PKWT_INTERNAL"] },
        employment_status: "ACTIVE",
        engineer_contracts: {
          some: {
            status: "ACTIVE",
            start_at: { lte: now },
            end_at: { gte: now },
          },
        },
      },
    ],
  };
}
