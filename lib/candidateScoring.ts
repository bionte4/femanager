import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CandidateScoreInput = {
  has_motorcycle: boolean;
  has_toolkit: boolean;
  education: string;
  experience_years: number;
  skills: string[];
  previous_vendor: string | null | undefined;
  city: string;
};

/**
 * Auto-scoring calon FE (0-100)
 */
export async function calculateScreeningScore(
  candidate: CandidateScoreInput
): Promise<number> {
  let score = 50;

  if (candidate.has_motorcycle) score += 20;
  else score -= 50;

  if (candidate.has_toolkit) score += 15;

  const edu = candidate.education.toUpperCase();
  if (["SMK_TKJ", "D3_TI", "S1_TI"].includes(edu) || edu.includes("SMK") || edu.includes("TI")) {
    score += 10;
  }

  if (candidate.experience_years > 1) score += 10;

  if (candidate.skills.some((s) => s.toUpperCase() === "EDC")) score += 10;

  if (candidate.previous_vendor?.trim()) score += 15;

  // Kota coverage kosong: FE < 3 di kota yang sama → +15
  const feInCity = await prisma.user.count({
    where: {
      role: Role.FIELD_ENGINEER,
      city: { equals: candidate.city, mode: "insensitive" },
      is_suspended: false,
    },
  });
  if (feInCity < 3) score += 15;

  return Math.max(0, Math.min(100, score));
}

export type CoverageGap = {
  city: string;
  province: string;
  tenant_count: number;
  fe_count: number;
  needed_count: number;
  ratio: number;
};

/**
 * Area butuh FE: rasio Tenant:FE > 20:1
 * + kebutuhan FE SDWAN (tenant dengan device ROUTER_SDWAN tanpa FE bersertifikasi di kota itu)
 */
export async function findCoverageGap(): Promise<(CoverageGap & { sdwan_needed?: number })[]> {
  const tenants = await prisma.tenant.groupBy({
    by: ["city", "province"],
    where: { is_active: true },
    _count: { _all: true },
  });

  const engineers = await prisma.user.groupBy({
    by: ["city"],
    where: {
      role: Role.FIELD_ENGINEER,
      is_suspended: false,
      city: { not: null },
    },
    _count: { _all: true },
  });

  const feByCity = new Map(
    engineers
      .filter((e) => e.city)
      .map((e) => [e.city!.toLowerCase(), e._count._all])
  );

  const sdwanDevices = await prisma.device.findMany({
    where: {
      OR: [
        { device_category: "ROUTER_SDWAN" },
        { type: "ROUTER_SDWAN" },
      ],
    },
    select: { tenant: { select: { city: true } } },
  });
  const sdwanTenantByCity = new Map<string, number>();
  for (const d of sdwanDevices) {
    const c = d.tenant.city.toLowerCase();
    sdwanTenantByCity.set(c, (sdwanTenantByCity.get(c) ?? 0) + 1);
  }

  const sdwanFes = await prisma.skillCertification.findMany({
    where: { skill: "SDWAN", is_active: true },
    select: { engineer: { select: { city: true } } },
  });
  const sdwanFeByCity = new Map<string, number>();
  for (const c of sdwanFes) {
    if (!c.engineer.city) continue;
    const key = c.engineer.city.toLowerCase();
    sdwanFeByCity.set(key, (sdwanFeByCity.get(key) ?? 0) + 1);
  }

  const gaps: (CoverageGap & { sdwan_needed?: number })[] = [];

  for (const t of tenants) {
    const feCount = feByCity.get(t.city.toLowerCase()) ?? 0;
    const tenantCount = t._count._all;
    const ratio = feCount === 0 ? tenantCount : tenantCount / feCount;
    const sdwanDevicesCount = sdwanTenantByCity.get(t.city.toLowerCase()) ?? 0;
    const sdwanFeCount = sdwanFeByCity.get(t.city.toLowerCase()) ?? 0;
    const sdwanNeeded =
      sdwanDevicesCount > 0
        ? Math.max(0, Math.ceil(sdwanDevicesCount / 10) - sdwanFeCount)
        : 0;

    if (ratio > 20 || feCount === 0 || sdwanNeeded > 0) {
      const idealFe = Math.max(1, Math.ceil(tenantCount / 20));
      gaps.push({
        city: t.city,
        province: t.province,
        tenant_count: tenantCount,
        fe_count: feCount,
        needed_count: Math.max(0, idealFe - feCount),
        ratio: Math.round(ratio * 10) / 10,
        sdwan_needed: sdwanNeeded,
      });
    }
  }

  return gaps.sort(
    (a, b) =>
      (b.sdwan_needed ?? 0) - (a.sdwan_needed ?? 0) ||
      b.needed_count - a.needed_count ||
      b.ratio - a.ratio
  );
}

/** Umur dari NIK (ddmmyy di digit 7-12, +40 jika perempuan) */
export function ageFromNik(nik: string | null | undefined): number | null {
  if (!nik || nik.length < 12) return null;
  let day = parseInt(nik.slice(6, 8), 10);
  const month = parseInt(nik.slice(8, 10), 10);
  let year = parseInt(nik.slice(10, 12), 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  if (day > 40) day -= 40;
  year += year >= 50 ? 1900 : 2000;
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 15 && age <= 80 ? age : null;
}
