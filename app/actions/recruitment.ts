"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  CandidateStatus,
  Prisma,
  Role,
  TransactionType,
} from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ageFromNik,
  calculateScreeningScore,
  findCoverageGap,
} from "@/lib/candidateScoring";
import { sendWhatsApp } from "@/lib/whatsapp";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireCoordinator() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, is_coordinator: true, role: true, full_name: true, phone: true },
  });
  if (!user?.is_coordinator && !(ADMIN_ROLES as readonly string[]).includes(user?.role ?? "")) {
    throw new Error("Unauthorized — bukan koordinator");
  }
  return { session, user: user! };
}

export async function getRecruitmentKpis() {
  await requireAdmin();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

  const [today, screening, training, trial, approvedMonth, feActive] =
    await Promise.all([
      prisma.engineerCandidate.count({ where: { created_at: { gte: start } } }),
      prisma.engineerCandidate.count({
        where: { status: { in: [CandidateStatus.NEW, CandidateStatus.SCREENING] } },
      }),
      prisma.engineerCandidate.count({ where: { status: CandidateStatus.TRAINING } }),
      prisma.engineerCandidate.count({ where: { status: CandidateStatus.TRIAL } }),
      prisma.engineerCandidate.count({
        where: {
          status: CandidateStatus.APPROVED,
          updated_at: { gte: monthStart },
        },
      }),
      prisma.user.count({
        where: { role: Role.FIELD_ENGINEER, is_suspended: false },
      }),
    ]);

  return {
    today,
    screening,
    training,
    trial,
    approved_month: approvedMonth,
    fe_active: feActive,
  };
}

export type CandidateFilters = {
  q?: string;
  status?: CandidateStatus | "ALL";
  province?: string;
  city?: string;
  education?: string;
  has_motorcycle?: boolean;
  skill?: string;
  coordinator_id?: string;
};

export async function getCandidates(filters: CandidateFilters = {}) {
  await requireAdmin();
  const where: Prisma.EngineerCandidateWhereInput = {};
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.province) where.province = { equals: filters.province, mode: "insensitive" };
  if (filters.city) where.city = { equals: filters.city, mode: "insensitive" };
  if (filters.education) where.education = filters.education;
  if (filters.has_motorcycle != null) where.has_motorcycle = filters.has_motorcycle;
  if (filters.skill) where.skills = { has: filters.skill };
  if (filters.coordinator_id) where.assigned_coordinator_id = filters.coordinator_id;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { full_name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.engineerCandidate.findMany({
    where,
    include: {
      coordinator: { select: { id: true, full_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 300,
  });

  return items.map((c) => ({
    ...c,
    age: ageFromNik(c.nik),
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  }));
}

export async function getCandidateMapPoints() {
  await requireAdmin();
  const items = await prisma.engineerCandidate.findMany({
    where: { lat: { not: null }, lng: { not: null } },
    select: {
      id: true,
      full_name: true,
      city: true,
      status: true,
      lat: true,
      lng: true,
      skills: true,
    },
  });
  return items;
}

export async function getCoverageGapsAction() {
  await requireAdmin();
  return findCoverageGap();
}

export async function getCoordinators() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { is_coordinator: true },
    select: { id: true, full_name: true, phone: true, city: true },
    orderBy: { full_name: "asc" },
  });
}

export async function getCandidateById(id: string) {
  await requireAdmin();
  const c = await prisma.engineerCandidate.findUnique({
    where: { id },
    include: {
      coordinator: { select: { id: true, full_name: true, phone: true } },
    },
  });
  if (!c) return null;

  // Trial tickets: tickets assigned to phone match if already engineer, else empty
  const engUser = await prisma.user.findUnique({
    where: { phone: c.phone },
    select: { id: true },
  });
  const trialTickets = engUser
    ? await prisma.ticket.findMany({
        where: { assigned_engineer_id: engUser.id },
        select: {
          id: true,
          ticket_no: true,
          status: true,
          resolved_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 5,
      })
    : [];

  return {
    ...c,
    age: ageFromNik(c.nik),
    trial_tickets: trialTickets,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
  };
}

export async function screeningAction(input: {
  id: string;
  screening_score: number;
  notes?: string;
  pass: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const score = Math.max(0, Math.min(100, input.screening_score));
    await prisma.engineerCandidate.update({
      where: { id: input.id },
      data: {
        screening_score: score,
        notes: input.notes || undefined,
        status: input.pass ? CandidateStatus.TRAINING : CandidateStatus.REJECTED,
        rejection_reason: input.pass ? null : input.notes || "Tidak lolos screening",
      },
    });
    revalidatePath("/admin/recruitment");
    revalidatePath(`/admin/recruitment/${input.id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function trainingAction(input: {
  id: string;
  training_score: number;
  training_certificate_url?: string;
  pass: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.engineerCandidate.update({
      where: { id: input.id },
      data: {
        training_score: input.training_score,
        training_certificate_url: input.training_certificate_url || undefined,
        status: input.pass ? CandidateStatus.TRIAL : CandidateStatus.REJECTED,
        rejection_reason: input.pass ? null : "Tidak lolos training",
      },
    });
    revalidatePath("/admin/recruitment");
    revalidatePath(`/admin/recruitment/${input.id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

const COORDINATOR_BONUS = 25_000;

/**
 * Approve kandidat → buat User FIELD_ENGINEER + wallet + bonus koordinator
 */
export async function approveCandidateAction(
  id: string
): Promise<{ success: boolean; error?: string; phone?: string; password?: string }> {
  try {
    const session = await requireAdmin();
    const candidate = await prisma.engineerCandidate.findUnique({ where: { id } });
    if (!candidate) return { success: false, error: "Kandidat tidak ditemukan" };
    if (candidate.status === CandidateStatus.APPROVED) {
      return { success: false, error: "Sudah di-approve" };
    }
    if (candidate.status === CandidateStatus.BLACKLISTED) {
      return { success: false, error: "Kandidat blacklisted" };
    }

    const existing = await prisma.user.findUnique({ where: { phone: candidate.phone } });
    if (existing) return { success: false, error: "User dengan HP ini sudah ada" };

    const defaultPassword = `${candidate.phone.slice(-4)}123`;
    const hash = await bcrypt.hash(defaultPassword, 10);

    const skillCodes = Array.from(
      new Set(
        candidate.skills.map((s) => {
          const u = s.toUpperCase();
          if (u === "LAN" || u === "WAN") return u === "WAN" ? "SDWAN" : "WIFI";
          if (u === "MIKROTIK" || u === "FORTIGATE" || u === "CISCO") return "SDWAN";
          if (u === "PC") return "DESKTOP";
          return u;
        })
      )
    );

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          full_name: candidate.full_name,
          phone: candidate.phone,
          password: hash,
          role: Role.FIELD_ENGINEER,
          city: candidate.city,
          district: candidate.district,
          lat: candidate.lat,
          lng: candidate.lng,
          skills: skillCodes.length ? skillCodes : ["EDC", "DESKTOP"],
          trust_score: candidate.trust_score_initial,
          status: "AVAILABLE",
          has_motorcycle: candidate.has_motorcycle,
          has_toolkit: candidate.has_toolkit,
          has_car: candidate.has_car,
          partnership_status: "NOT_SIGNED",
          tools_owned: [
            candidate.has_motorcycle ? "motorcycle" : null,
            candidate.has_toolkit ? "toolkit" : null,
            candidate.has_laptop ? "laptop" : null,
            candidate.has_car ? "car" : null,
            candidate.has_ladder ? "tangga" : null,
            candidate.has_drill ? "bor" : null,
          ].filter(Boolean) as string[],
          can_work_for_others: true,
        },
      });

      await tx.engineerWallet.create({
        data: { engineer_id: u.id, balance: 0 },
      });

      // Buat EngineerAgreement PENDING dari template aktif
      const activeAgreement = await tx.partnershipAgreement.findFirst({
        where: { is_active: true },
      });
      if (activeAgreement) {
        await tx.engineerAgreement.create({
          data: {
            engineer_id: u.id,
            agreement_id: activeAgreement.id,
            status: "PENDING",
            consent_text:
              "Saya telah membaca dan menyetujui bahwa hubungan ini adalah kemitraan, bukan hubungan kerja. Saya bebas menolak pekerjaan dan bekerja di tempat lain.",
          },
        });
      }

      await tx.engineerCandidate.update({
        where: { id },
        data: { status: CandidateStatus.APPROVED },
      });

      // Bonus koordinator Rp 25.000
      if (candidate.assigned_coordinator_id) {
        let wallet = await tx.engineerWallet.findUnique({
          where: { engineer_id: candidate.assigned_coordinator_id },
        });
        if (!wallet) {
          wallet = await tx.engineerWallet.create({
            data: { engineer_id: candidate.assigned_coordinator_id },
          });
        }
        await tx.walletTransaction.create({
          data: {
            wallet_id: wallet.id,
            type: TransactionType.BONUS,
            amount: COORDINATOR_BONUS,
            description: `Bonus rekrut FE ${candidate.full_name}`,
            created_by: session.user.id,
          },
        });
        await tx.engineerWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: COORDINATOR_BONUS },
            total_earned: { increment: COORDINATOR_BONUS },
          },
        });
      }

      return u;
    });

    void sendWhatsApp({
      phone: candidate.whatsapp || candidate.phone,
      message: `Selamat ${candidate.full_name}, kamu lolos! Login pakai HP ${candidate.phone} & password ${defaultPassword} di app.fetrack.com/engineer`,
    });

    if (candidate.assigned_coordinator_id) {
      const coord = await prisma.user.findUnique({
        where: { id: candidate.assigned_coordinator_id },
      });
      if (coord) {
        void sendWhatsApp({
          phone: coord.phone,
          message: `Bonus rekrut Rp ${COORDINATOR_BONUS.toLocaleString("id-ID")} — kandidat ${candidate.full_name} sudah APPROVED jadi FE.`,
        });
      }
    }

    revalidatePath("/admin/recruitment");
    revalidatePath(`/admin/recruitment/${id}`);
    revalidatePath("/admin/engineers");
    revalidatePath("/coordinator/recruits");
    return {
      success: true,
      phone: user.phone,
      password: defaultPassword,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal approve" };
  }
}

export async function blacklistCandidateAction(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.engineerCandidate.update({
      where: { id },
      data: {
        status: CandidateStatus.BLACKLISTED,
        rejection_reason: reason || "Blacklisted",
      },
    });
    revalidatePath("/admin/recruitment");
    revalidatePath(`/admin/recruitment/${id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function assignCoordinatorAction(
  candidateIds: string[],
  coordinatorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.engineerCandidate.updateMany({
      where: { id: { in: candidateIds } },
      data: { assigned_coordinator_id: coordinatorId },
    });
    revalidatePath("/admin/recruitment");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function bulkUpdateStatusAction(
  candidateIds: string[],
  status: CandidateStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.engineerCandidate.updateMany({
      where: { id: { in: candidateIds } },
      data: { status },
    });
    revalidatePath("/admin/recruitment");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function rescoreCandidateAction(
  id: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    await requireAdmin();
    const c = await prisma.engineerCandidate.findUnique({ where: { id } });
    if (!c) return { success: false, error: "Not found" };
    const score = await calculateScreeningScore(c);
    await prisma.engineerCandidate.update({
      where: { id },
      data: { screening_score: score },
    });
    revalidatePath(`/admin/recruitment/${id}`);
    return { success: true, score };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

/** Koordinator: list recruits */
export async function getMyRecruits() {
  const { user } = await requireCoordinator();
  const items = await prisma.engineerCandidate.findMany({
    where: { assigned_coordinator_id: user.id },
    orderBy: { created_at: "desc" },
  });

  const approved = items.filter((i) => i.status === CandidateStatus.APPROVED).length;
  const bonusTx = await prisma.walletTransaction.findMany({
    where: {
      type: TransactionType.BONUS,
      description: { contains: "Bonus rekrut" },
      wallet: { engineer_id: user.id },
    },
  });
  const bonusEarned = bonusTx.reduce((s, t) => s + t.amount, 0);

  return {
    items: items.map((c) => ({
      ...c,
      created_at: c.created_at.toISOString(),
    })),
    stats: {
      total: items.length,
      approved,
      bonus_earned: bonusEarned,
    },
  };
}

export async function createManualCandidateAction(input: {
  full_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  province: string;
  city: string;
  district: string;
  education: string;
  skills: string[];
  has_motorcycle: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const { user } = await requireCoordinator();
    const exists = await prisma.engineerCandidate.findUnique({
      where: { phone: input.phone },
    });
    if (exists) return { success: false, error: "HP sudah terdaftar" };

    const score = await calculateScreeningScore({
      ...input,
      has_toolkit: false,
      experience_years: 0,
      previous_vendor: null,
    });

    const c = await prisma.engineerCandidate.create({
      data: {
        ...input,
        status: CandidateStatus.NEW,
        screening_score: score,
        assigned_coordinator_id: user.id,
      },
    });
    revalidatePath("/coordinator/recruits");
    revalidatePath("/admin/recruitment");
    return { success: true, id: c.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}
