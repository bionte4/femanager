import type { DeviceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Legacy map device type → category code */
export function categoryCodeForDeviceType(
  type: DeviceType | null | undefined
): string | null {
  if (!type) return null;
  if (type === "EDC_BCA" || type === "EDC_BRI") return "EDC";
  if (type === "ROUTER_SDWAN") return "SDWAN";
  if (type === "ROUTER") return "WIFI";
  if (type === "SWITCH") return "WIFI";
  return null;
}

/**
 * Alias skill FE ↔ service category code.
 * FE bisa punya skill legacy (EDC/LAN/WAN) atau code kategori (SDWAN/WIFI/…).
 */
const CATEGORY_SKILL_ALIASES: Record<string, string[]> = {
  EDC: ["EDC"],
  SDWAN: ["SDWAN", "WAN"],
  WIFI: ["WIFI", "LAN", "ROUTER"],
  CCTV: ["CCTV"],
  LAPTOP: ["LAPTOP", "DESKTOP"],
  DESKTOP: ["DESKTOP", "LAPTOP"],
  PRINTER: ["PRINTER"],
  ACCESS_POINT: ["WIFI", "LAN", "ACCESS_POINT"],
};

export function skillAliasesForCategory(categoryCode: string): string[] {
  const code = categoryCode.toUpperCase();
  const aliases = CATEGORY_SKILL_ALIASES[code] ?? [code];
  return Array.from(new Set([code, ...aliases].map((s) => s.toUpperCase())));
}

export function engineerHasSkill(
  skills: string[],
  categoryCode: string | null | undefined
): boolean {
  if (!categoryCode) return true;
  const aliases = skillAliasesForCategory(categoryCode);
  const set = new Set(skills.map((s) => s.toUpperCase()));
  return aliases.some((a) => set.has(a));
}

/** Sertifikasi aktif: is_active + belum expired */
export async function getActiveCertifiedEngineerIds(params: {
  engineerIds: string[];
  categoryCode: string;
}): Promise<Set<string>> {
  if (params.engineerIds.length === 0) return new Set();
  const aliases = skillAliasesForCategory(params.categoryCode);
  const now = new Date();

  const rows = await prisma.skillCertification.findMany({
    where: {
      engineer_id: { in: params.engineerIds },
      is_active: true,
      OR: [{ expiry_at: null }, { expiry_at: { gt: now } }],
    },
    select: { engineer_id: true, skill: true },
  });

  const aliasSet = new Set(aliases.map((a) => a.toUpperCase()));
  return new Set(
    rows
      .filter((r) => aliasSet.has(r.skill.toUpperCase()))
      .map((r) => r.engineer_id)
  );
}

export type EligibilityResult =
  | { ok: true; categoryCode: string | null; requiresCert: boolean }
  | { ok: false; error: string; categoryCode: string | null; requiresCert: boolean };

/**
 * Validasi FE cocok untuk ticket (skill + sertifikasi jika wajib).
 */
export async function assertEngineerEligibleForTicket(params: {
  engineerId: string;
  skills: string[];
  categoryCode: string | null;
  requiresCertification: boolean;
  /** SDWAN legacy: trust > 85 */
  trustScore?: number;
}): Promise<EligibilityResult> {
  const { categoryCode, requiresCertification } = params;

  if (categoryCode && !engineerHasSkill(params.skills, categoryCode)) {
    return {
      ok: false,
      error: `Engineer tidak punya skill ${categoryCode} (atau alias terkait)`,
      categoryCode,
      requiresCert: requiresCertification,
    };
  }

  if (requiresCertification && categoryCode) {
    const certified = await getActiveCertifiedEngineerIds({
      engineerIds: [params.engineerId],
      categoryCode,
    });
    if (!certified.has(params.engineerId)) {
      return {
        ok: false,
        error: `Engineer belum punya sertifikasi aktif ${categoryCode} (atau sudah expired)`,
        categoryCode,
        requiresCert: true,
      };
    }
  }

  // SDWAN ekstra: trust score
  if (
    categoryCode === "SDWAN" &&
    typeof params.trustScore === "number" &&
    params.trustScore <= 85
  ) {
    return {
      ok: false,
      error: "SDWAN membutuhkan trust_score > 85",
      categoryCode,
      requiresCert: true,
    };
  }

  return {
    ok: true,
    categoryCode,
    requiresCert: requiresCertification,
  };
}

export async function resolveTicketCategory(ticket: {
  service_category?: { code: string; requires_certification: boolean } | null;
  device?: {
    type: DeviceType | null;
    service_category?: { code: string; requires_certification: boolean } | null;
  } | null;
}): Promise<{ categoryCode: string | null; requiresCertification: boolean }> {
  const category =
    ticket.service_category ?? ticket.device?.service_category ?? null;
  const categoryCode =
    category?.code ?? categoryCodeForDeviceType(ticket.device?.type ?? null);
  const requiresCertification =
    category?.requires_certification === true || categoryCode === "SDWAN";
  return { categoryCode, requiresCertification };
}
