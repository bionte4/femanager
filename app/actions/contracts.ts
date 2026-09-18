"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type EngagementType, type EngineerContractType } from "@prisma/client";
import { auth, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  contractTypeToEngagement,
  listExpiringContracts,
  parseCities,
} from "@/lib/contracts";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireContractAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    !(CONTRACT_ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    throw new Error("Unauthorized — hanya SUPER_ADMIN / ADMIN_NOC");
  }
  return session;
}

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized — SUPER_ADMIN only");
  }
  return session;
}

const createSchema = z.object({
  user_id: z.string().min(1),
  type: z.enum(["PKWT_OUTTASK", "PKWT_INTERNAL"]),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  client_label: z.string().optional(),
  placement_cities: z.string().optional(),
  document_url: z.string().optional(),
  notes: z.string().optional(),
  activate_now: z.boolean().optional(),
});

function revalidateContractPaths(userId: string) {
  revalidatePath(`/admin/engineers/${userId}`);
  revalidatePath(`/admin/engineers/${userId}/contracts`);
  revalidatePath("/admin/hr/contracts");
  revalidatePath("/admin/engineers");
}

function assertHttpsDocumentUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new Error("URL dokumen harus https://");
    }
    return parsed.toString();
  } catch (e) {
    if (e instanceof Error && e.message.includes("https")) throw e;
    throw new Error("URL dokumen tidak valid");
  }
}

async function assertNoPendingWithdrawal(userId: string) {
  const pending = await prisma.withdrawal.findFirst({
    where: {
      engineer_id: userId,
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: { id: true },
  });
  if (pending) {
    throw new Error(
      "Ada withdrawal pending/approved — selesaikan dulu sebelum ganti engagement"
    );
  }
}

async function ensureEngagementForContract(params: {
  userId: string;
  contractType: EngineerContractType;
  changedBy: string;
  reason: string;
}) {
  const target = contractTypeToEngagement(params.contractType);
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { engagement_type: true },
  });
  if (!user) throw new Error("Engineer tidak ditemukan");
  if (user.engagement_type === target) return;

  // Flip klasifikasi kerja = sensitif; blok jika ada cashout pending
  await assertNoPendingWithdrawal(params.userId);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: params.userId },
      data: {
        engagement_type: target,
        employment_status: "ACTIVE",
      },
    }),
    prisma.engagementChangeLog.create({
      data: {
        user_id: params.userId,
        from_type: user.engagement_type,
        to_type: target,
        reason: params.reason,
        changed_by: params.changedBy,
      },
    }),
  ]);
}

export async function listEngineerContracts(userId: string) {
  await requireContractAdmin();
  return prisma.engineerContract.findMany({
    where: { user_id: userId },
    orderBy: [{ status: "asc" }, { end_at: "desc" }],
  });
}

export async function listExpiringContractsAction(withinDays = 30) {
  await requireContractAdmin();
  return listExpiringContracts(withinDays);
}

export async function createEngineerContractAction(
  input: z.infer<typeof createSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireContractAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
    }

    const startAt = new Date(parsed.data.start_at);
    const endAt = new Date(parsed.data.end_at);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return { success: false, error: "Tanggal tidak valid" };
    }
    if (endAt <= startAt) {
      return { success: false, error: "end_at harus setelah start_at" };
    }

    const docUrl = parsed.data.document_url
      ? assertHttpsDocumentUrl(parsed.data.document_url)
      : null;

    const engineer = await prisma.user.findFirst({
      where: { id: parsed.data.user_id, role: "FIELD_ENGINEER" },
      select: { id: true, engagement_type: true },
    });
    if (!engineer) return { success: false, error: "Engineer tidak ditemukan" };

    const activate = parsed.data.activate_now === true;
    const status = activate
      ? "ACTIVE"
      : "DRAFT";

    if (activate) {
      await ensureEngagementForContract({
        userId: engineer.id,
        contractType: parsed.data.type,
        changedBy: session.user.id,
        reason: "Aktivasi kontrak baru",
      });
    }

    const created = await prisma.engineerContract.create({
      data: {
        user_id: engineer.id,
        type: parsed.data.type,
        status,
        start_at: startAt,
        end_at: endAt,
        client_label: parsed.data.client_label?.trim() || null,
        placement_cities: parseCities(parsed.data.placement_cities),
        document_url: docUrl,
        notes: parsed.data.notes?.trim() || null,
        created_by: session.user.id,
      },
    });

    if (activate) {
      await prisma.user.update({
        where: { id: engineer.id },
        data: { employment_status: "ACTIVE" },
      });
    }

    revalidateContractPaths(engineer.id);
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal buat kontrak",
    };
  }
}

export async function activateContractAction(
  contractId: string
): Promise<ActionResult> {
  try {
    const session = await requireContractAdmin();
    const contract = await prisma.engineerContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) return { success: false, error: "Kontrak tidak ditemukan" };
    if (contract.status === "ACTIVE") {
      return { success: true };
    }
    if (
      contract.status === "ENDED" ||
      contract.status === "EXPIRED"
    ) {
      return {
        success: false,
        error: "Kontrak ended/expired — buat kontrak baru atau extend dulu",
      };
    }

    await ensureEngagementForContract({
      userId: contract.user_id,
      contractType: contract.type,
      changedBy: session.user.id,
      reason: `Aktivasi kontrak ${contract.id}`,
    });

    await prisma.$transaction([
      prisma.engineerContract.update({
        where: { id: contractId },
        data: { status: "ACTIVE" },
      }),
      prisma.user.update({
        where: { id: contract.user_id },
        data: { employment_status: "ACTIVE" },
      }),
    ]);

    revalidateContractPaths(contract.user_id);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal aktivasi",
    };
  }
}

export async function suspendContractAction(
  contractId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    await requireContractAdmin();
    const contract = await prisma.engineerContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) return { success: false, error: "Kontrak tidak ditemukan" };

    await prisma.$transaction([
      prisma.engineerContract.update({
        where: { id: contractId },
        data: {
          status: "SUSPENDED",
          notes: reason
            ? `${contract.notes ? contract.notes + "\n" : ""}[suspend] ${reason}`
            : contract.notes,
        },
      }),
      prisma.user.update({
        where: { id: contract.user_id },
        data: { employment_status: "SUSPENDED" },
      }),
    ]);

    revalidateContractPaths(contract.user_id);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal suspend",
    };
  }
}

export async function endContractAction(
  contractId: string
): Promise<ActionResult> {
  try {
    await requireContractAdmin();
    const contract = await prisma.engineerContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) return { success: false, error: "Kontrak tidak ditemukan" };

    await prisma.engineerContract.update({
      where: { id: contractId },
      data: { status: "ENDED" },
    });

    const stillActive = await prisma.engineerContract.findFirst({
      where: {
        user_id: contract.user_id,
        status: "ACTIVE",
        end_at: { gte: new Date() },
      },
    });
    if (!stillActive) {
      await prisma.user.update({
        where: { id: contract.user_id },
        data: { employment_status: "ENDED" },
      });
    }

    revalidateContractPaths(contract.user_id);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal end kontrak",
    };
  }
}

export async function extendContractAction(input: {
  contract_id: string;
  end_at: string;
}): Promise<ActionResult> {
  try {
    await requireContractAdmin();
    const endAt = new Date(input.end_at);
    if (Number.isNaN(endAt.getTime())) {
      return { success: false, error: "Tanggal tidak valid" };
    }

    const contract = await prisma.engineerContract.findUnique({
      where: { id: input.contract_id },
    });
    if (!contract) return { success: false, error: "Kontrak tidak ditemukan" };
    if (endAt <= contract.start_at) {
      return { success: false, error: "end_at harus setelah start_at" };
    }

    const data: {
      end_at: Date;
      status?: "ACTIVE" | "DRAFT" | "SUSPENDED" | "ENDED" | "EXPIRED";
    } = { end_at: endAt };

    // Extend dari EXPIRED/ENDED → kembali ACTIVE jika masih masa berlaku
    if (
      (contract.status === "EXPIRED" ||
        contract.status === "ENDED") &&
      endAt >= new Date()
    ) {
      data.status = "ACTIVE";
    }

    await prisma.engineerContract.update({
      where: { id: contract.id },
      data,
    });

    if (data.status === "ACTIVE") {
      await prisma.user.update({
        where: { id: contract.user_id },
        data: { employment_status: "ACTIVE" },
      });
    }

    revalidateContractPaths(contract.user_id);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal extend",
    };
  }
}

const switchSchema = z.object({
  user_id: z.string().min(1),
  to_type: z.enum(["MITRA", "PKWT_OUTTASK", "PKWT_INTERNAL"]),
  reason: z.string().min(3),
});

/**
 * SUPER_ADMIN: ganti MITRA ↔ PKWT dengan audit log.
 * Ke PKWT tanpa kontrak aktif → employment ACTIVE tetap butuh kontrak untuk eligible.
 * Ke MITRA → end semua kontrak ACTIVE, employment NONE.
 */
export async function switchEngagementAction(
  input: z.infer<typeof switchSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const parsed = switchSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
    }

    const user = await prisma.user.findFirst({
      where: { id: parsed.data.user_id, role: "FIELD_ENGINEER" },
    });
    if (!user) return { success: false, error: "Engineer tidak ditemukan" };
    if (user.engagement_type === parsed.data.to_type) {
      return { success: true };
    }

    try {
      await assertNoPendingWithdrawal(user.id);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Gagal validasi withdrawal",
      };
    }

    const toPkwt =
      parsed.data.to_type === "PKWT_OUTTASK" ||
      parsed.data.to_type === "PKWT_INTERNAL";

    await prisma.$transaction(async (tx) => {
      if (!toPkwt) {
        // Kembali ke Mitra: tutup kontrak aktif
        await tx.engineerContract.updateMany({
          where: {
            user_id: user.id,
            status: {
              in: [
                "ACTIVE",
                "DRAFT",
                "SUSPENDED",
              ],
            },
          },
          data: { status: "ENDED" },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          engagement_type: parsed.data.to_type,
          employment_status: toPkwt
            ? "ACTIVE"
            : "NONE",
        },
      });

      await tx.engagementChangeLog.create({
        data: {
          user_id: user.id,
          from_type: user.engagement_type,
          to_type: parsed.data.to_type,
          reason: parsed.data.reason,
          changed_by: session.user.id,
        },
      });
    });

    revalidateContractPaths(user.id);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal switch engagement",
    };
  }
}

export async function listEngagementChangeLogs(userId: string) {
  await requireContractAdmin();
  return prisma.engagementChangeLog.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 20,
  });
}
