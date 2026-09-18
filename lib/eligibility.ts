import {
  PartnershipStatus,
  Role,
  type EngagementType,
  type EmploymentStatus,
  type User,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EligibilityReason =
  | "NOT_FE"
  | "SUSPENDED"
  | "PARTNERSHIP_NOT_SIGNED"
  | "EMPLOYMENT_NOT_ACTIVE"
  | "NO_ACTIVE_CONTRACT"
  | "USER_NOT_FOUND";

export type EligibilityResult = {
  ok: boolean;
  reason?: EligibilityReason;
  engagement_type?: EngagementType;
  contract_id?: string;
};

export type EligibilityUser = Pick<
  User,
  | "id"
  | "role"
  | "is_suspended"
  | "engagement_type"
  | "employment_status"
  | "partnership_status"
>;

/** String literal — hindari enum runtime undefined (HMR / circular import Prisma) */
const PKWT_TYPES = ["PKWT_OUTTASK", "PKWT_INTERNAL"] as const;

export function isPkwtEngagement(
  type: EngagementType | string
): boolean {
  return (PKWT_TYPES as readonly string[]).includes(type);
}

export function isMitraEngagement(
  type: EngagementType | string
): boolean {
  return type === "MITRA";
}

/** Pesan error untuk UI / server action */
export function eligibilityMessage(reason?: EligibilityReason): string {
  switch (reason) {
    case "PARTNERSHIP_NOT_SIGNED":
      return "Anda harus tanda tangan perjanjian kemitraan dulu";
    case "EMPLOYMENT_NOT_ACTIVE":
      return "Status kepegawaian tidak aktif. Hubungi HR/admin.";
    case "NO_ACTIVE_CONTRACT":
      return "Belum ada kontrak PKWT aktif. Hubungi HR/admin.";
    case "SUSPENDED":
      return "Akun Anda ditangguhkan";
    case "NOT_FE":
      return "Hanya field engineer yang dapat mengakses";
    case "USER_NOT_FOUND":
      return "User tidak ditemukan";
    default:
      return "Anda belum eligible untuk bekerja";
  }
}

/**
 * Evaluasi sync. Untuk PKWT, pass hasActiveContract + contractId dari query.
 */
export function evaluateEligibility(
  user: EligibilityUser,
  options?: { hasActiveContract?: boolean; contractId?: string }
): EligibilityResult {
  if (user.role !== Role.FIELD_ENGINEER) {
    return {
      ok: false,
      reason: "NOT_FE",
      engagement_type: user.engagement_type,
    };
  }
  if (user.is_suspended) {
    return {
      ok: false,
      reason: "SUSPENDED",
      engagement_type: user.engagement_type,
    };
  }

  if (user.engagement_type === "MITRA") {
    if (user.partnership_status !== PartnershipStatus.SIGNED) {
      return {
        ok: false,
        reason: "PARTNERSHIP_NOT_SIGNED",
        engagement_type: "MITRA",
      };
    }
    return { ok: true, engagement_type: "MITRA" };
  }

  // PKWT_OUTTASK | PKWT_INTERNAL
  if ((user.employment_status as EmploymentStatus) !== "ACTIVE") {
    return {
      ok: false,
      reason: "EMPLOYMENT_NOT_ACTIVE",
      engagement_type: user.engagement_type,
    };
  }

  if (!options?.hasActiveContract) {
    return {
      ok: false,
      reason: "NO_ACTIVE_CONTRACT",
      engagement_type: user.engagement_type,
    };
  }

  return {
    ok: true,
    engagement_type: user.engagement_type,
    contract_id: options.contractId,
  };
}

export async function findActiveContract(userId: string) {
  return prisma.engineerContract.findFirst({
    where: {
      user_id: userId,
      status: "ACTIVE",
      end_at: { gte: new Date() },
      start_at: { lte: new Date() },
    },
    orderBy: { end_at: "desc" },
  });
}

/** Gate pusat — Mitra: partnership SIGNED; PKWT: employment ACTIVE + kontrak aktif */
export async function eligibleForWork(
  userId: string
): Promise<EligibilityResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      is_suspended: true,
      engagement_type: true,
      employment_status: true,
      partnership_status: true,
    },
  });

  if (!user) {
    return { ok: false, reason: "USER_NOT_FOUND" };
  }

  if (isMitraEngagement(user.engagement_type)) {
    return evaluateEligibility(user);
  }

  const contract = await findActiveContract(userId);
  return evaluateEligibility(user, {
    hasActiveContract: !!contract,
    contractId: contract?.id,
  });
}

export async function assertEligibleForWork(userId: string): Promise<{
  userId: string;
  engagement_type: EngagementType;
  contract_id?: string;
}> {
  const result = await eligibleForWork(userId);
  if (!result.ok || !result.engagement_type) {
    throw new Error(eligibilityMessage(result.reason));
  }
  return {
    userId,
    engagement_type: result.engagement_type,
    contract_id: result.contract_id,
  };
}
