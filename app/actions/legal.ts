"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  AgreementStatus,
  ComplianceType,
  EngagementType,
  PartnershipStatus,
  Prisma,
} from "@prisma/client";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  PARTNERSHIP_AGREEMENT_V1_HTML,
  PARTNERSHIP_CONSENT_TEXT,
} from "@/lib/legal/agreement-template";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function ensurePendingAgreementForEngineer(engineerId: string) {
  const active = await prisma.partnershipAgreement.findFirst({
    where: { is_active: true },
  });
  if (!active) return null;

  const existing = await prisma.engineerAgreement.findUnique({
    where: {
      engineer_id_agreement_id: {
        engineer_id: engineerId,
        agreement_id: active.id,
      },
    },
  });
  if (existing) return existing;

  return prisma.engineerAgreement.create({
    data: {
      engineer_id: engineerId,
      agreement_id: active.id,
      status: AgreementStatus.PENDING,
      consent_text: PARTNERSHIP_CONSENT_TEXT,
    },
  });
}

export async function getActiveAgreementForEngineer(engineerId: string) {
  const user = await prisma.user.findUnique({
    where: { id: engineerId },
    select: {
      id: true,
      full_name: true,
      phone: true,
      city: true,
      partnership_status: true,
      engagement_type: true,
      tools_owned: true,
      can_work_for_others: true,
      has_motorcycle: true,
      has_toolkit: true,
      has_car: true,
    },
  });
  if (!user) return null;

  // PKWT tidak memakai perjanjian kemitraan
  if (user.engagement_type !== EngagementType.MITRA) {
    return { user, agreement: null, engineerAgreement: null };
  }

  const active = await prisma.partnershipAgreement.findFirst({
    where: { is_active: true },
  });
  if (!active) return { user, agreement: null, engineerAgreement: null };

  let ea = await prisma.engineerAgreement.findUnique({
    where: {
      engineer_id_agreement_id: {
        engineer_id: engineerId,
        agreement_id: active.id,
      },
    },
    include: { agreement: true },
  });

  // Jangan auto-create PENDING jika user sudah SIGNED (bikin UI agreement "aneh"/blank path)
  if (!ea && user.partnership_status !== PartnershipStatus.SIGNED) {
    ea = await prisma.engineerAgreement.create({
      data: {
        engineer_id: engineerId,
        agreement_id: active.id,
        status: AgreementStatus.PENDING,
        consent_text: PARTNERSHIP_CONSENT_TEXT,
      },
      include: { agreement: true },
    });
  }

  return { user, agreement: active, engineerAgreement: ea };
}

export async function signPartnershipAgreementAction(input: {
  signature_data: string;
  consent_checked: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!input.consent_checked) {
      return { success: false, error: "Centang persetujuan wajib" };
    }
    if (!input.signature_data || input.signature_data.length < 100) {
      return { success: false, error: "Tanda tangan wajib diisi" };
    }

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";
    const ua = h.get("user-agent") || "unknown";

    const data = await getActiveAgreementForEngineer(session.user.id);
    if (data?.user && data.user.engagement_type !== EngagementType.MITRA) {
      return {
        success: false,
        error: "Perjanjian kemitraan hanya untuk Mitra, bukan karyawan PKWT",
      };
    }
    if (!data?.agreement || !data.engineerAgreement) {
      return { success: false, error: "Tidak ada perjanjian aktif" };
    }
    if (data.engineerAgreement.status === AgreementStatus.SIGNED) {
      return { success: true };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.engineerAgreement.update({
        where: { id: data.engineerAgreement!.id },
        data: {
          status: AgreementStatus.SIGNED,
          signed_at: now,
          signature_data: input.signature_data,
          ip_address: ip,
          user_agent: ua,
          consent_text: PARTNERSHIP_CONSENT_TEXT,
        },
      });
      await tx.user.update({
        where: { id: session.user.id },
        data: { partnership_status: PartnershipStatus.SIGNED },
      });
      await tx.complianceLog.create({
        data: {
          engineer_id: session.user.id,
          type: ComplianceType.AGREEMENT_SIGNED,
          metadata: {
            agreement_id: data.agreement!.id,
            version: data.agreement!.version,
            ip,
          },
        },
      });
    });

    revalidatePath("/engineer");
    revalidatePath("/engineer/agreement");
    revalidatePath("/engineer/profile");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal tanda tangan",
    };
  }
}

export async function listPartnershipAgreements() {
  await requireAdmin();
  return prisma.partnershipAgreement.findMany({
    orderBy: { created_at: "desc" },
    include: { _count: { select: { engineer_agreements: true } } },
  });
}

export async function upsertPartnershipAgreementAction(input: {
  id?: string;
  version: string;
  title: string;
  content_html: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const session = await requireAdmin();
    if (input.id) {
      await prisma.partnershipAgreement.update({
        where: { id: input.id },
        data: {
          version: input.version,
          title: input.title,
          content_html: input.content_html,
        },
      });
      revalidatePath("/admin/legal");
      return { success: true, id: input.id };
    }
    const row = await prisma.partnershipAgreement.create({
      data: {
        version: input.version,
        title: input.title,
        content_html: input.content_html,
        is_active: false,
        created_by: session.user.id,
      },
    });
    revalidatePath("/admin/legal");
    return { success: true, id: row.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function setActiveAgreementAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.$transaction(async (tx) => {
      await tx.partnershipAgreement.updateMany({
        data: { is_active: false },
      });
      await tx.partnershipAgreement.update({
        where: { id },
        data: { is_active: true },
      });
    });
    revalidatePath("/admin/legal");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function listEngineerAgreements(params?: {
  status?: string;
  q?: string;
}) {
  await requireAdmin();
  return prisma.engineerAgreement.findMany({
    where: {
      status: params?.status
        ? (params.status as AgreementStatus)
        : undefined,
      engineer: params?.q
        ? {
            OR: [
              { full_name: { contains: params.q, mode: "insensitive" } },
              { phone: { contains: params.q } },
            ],
          }
        : undefined,
    },
    include: {
      engineer: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          city: true,
          partnership_status: true,
        },
      },
      agreement: { select: { id: true, version: true, title: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });
}

export async function revokeEngineerAgreementAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const ea = await prisma.engineerAgreement.update({
      where: { id },
      data: { status: AgreementStatus.REVOKED },
    });
    await prisma.user.update({
      where: { id: ea.engineer_id },
      data: { partnership_status: PartnershipStatus.NOT_SIGNED },
    });
    revalidatePath("/admin/legal");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal" };
  }
}

export async function getComplianceDashboard() {
  await requireAdmin();

  const [
    signed,
    notSigned,
    rejectLogs,
    acceptLogs,
    recentLogs,
    unsignedWithJobs,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        role: "FIELD_ENGINEER",
        partnership_status: PartnershipStatus.SIGNED,
      },
    }),
    prisma.user.count({
      where: {
        role: "FIELD_ENGINEER",
        partnership_status: PartnershipStatus.NOT_SIGNED,
      },
    }),
    prisma.complianceLog.count({
      where: { type: ComplianceType.JOB_REJECT },
    }),
    prisma.complianceLog.count({
      where: { type: ComplianceType.JOB_ACCEPT },
    }),
    prisma.complianceLog.findMany({
      take: 50,
      orderBy: { created_at: "desc" },
      include: {
        engineer: { select: { id: true, full_name: true, phone: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "FIELD_ENGINEER",
        partnership_status: { not: PartnershipStatus.SIGNED },
        assigned_tickets: {
          some: {
            status: {
              in: [
                "ASSIGNED",
                "ON_THE_WAY",
                "ON_SITE",
                "IN_PROGRESS",
                "RESOLVED",
                "CLOSED",
              ],
            },
          },
        },
      },
      select: {
        id: true,
        full_name: true,
        phone: true,
        partnership_status: true,
        _count: { select: { assigned_tickets: true } },
      },
      take: 50,
    }),
  ]);

  const acceptRate =
    acceptLogs + rejectLogs > 0
      ? Math.round((acceptLogs / (acceptLogs + rejectLogs)) * 1000) / 10
      : 100;

  // Enrich logs with ticket_no
  const ticketIds = recentLogs
    .map((l) => l.ticket_id)
    .filter((id): id is string => !!id);
  const tickets =
    ticketIds.length > 0
      ? await prisma.ticket.findMany({
          where: { id: { in: ticketIds } },
          select: { id: true, ticket_no: true },
        })
      : [];
  const ticketMap = new Map(tickets.map((t) => [t.id, t.ticket_no]));

  return {
    kpi: {
      signed,
      notSigned,
      totalRejected: rejectLogs,
      acceptRate,
    },
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      type: l.type,
      engineer_id: l.engineer_id,
      engineer_name: l.engineer.full_name,
      ticket_id: l.ticket_id,
      ticket_no: l.ticket_id ? ticketMap.get(l.ticket_id) ?? null : null,
      metadata: l.metadata,
      created_at: l.created_at.toISOString(),
    })),
    unsignedWithJobs,
  };
}

export async function seedDefaultAgreementIfMissing() {
  const existing = await prisma.partnershipAgreement.findFirst({
    where: { version: AGREEMENT_VERSION },
  });
  if (existing) return existing;

  await prisma.partnershipAgreement.updateMany({ data: { is_active: false } });
  return prisma.partnershipAgreement.create({
    data: {
      version: AGREEMENT_VERSION,
      title: AGREEMENT_TITLE,
      content_html: PARTNERSHIP_AGREEMENT_V1_HTML,
      is_active: true,
    },
  });
}

export async function logCompliance(input: {
  engineer_id: string;
  type: ComplianceType;
  ticket_id?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.complianceLog.create({
    data: {
      engineer_id: input.engineer_id,
      type: input.type,
      ticket_id: input.ticket_id ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}
