"use server";

import { revalidatePath } from "next/cache";
import { DeviceType, Prisma, SlaTier, TicketType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/rbac";

async function requireAdmin() {
  return requireMasterAdmin();
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const ruleSchema = z.object({
  name: z.string().min(2).max(100),
  device_type: z
    .enum(["EDC_BCA", "EDC_BRI", "ROUTER", "SWITCH", ""])
    .optional()
    .nullable(),
  sla_tier: z
    .enum(["TIER1_JABODETABEK", "TIER2_PROVINCE", "TIER3_KABUPATEN", ""])
    .optional()
    .nullable(),
  ticket_type: z.enum(["INCIDENT", "PM", "CM"]),
  base_fee: z.coerce.number().int().min(0),
  bonus_ontime_fee: z.coerce.number().int().min(0).default(0),
  penalty_breach_fee: z.coerce.number().int().max(0).default(0),
  is_active: z.boolean().default(true),
});

export async function listCommissionRules() {
  await requireAdmin();
  return prisma.commissionRule.findMany({
    orderBy: [{ ticket_type: "asc" }, { name: "asc" }],
  });
}

export async function createCommissionRule(
  input: z.infer<typeof ruleSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const data = ruleSchema.parse(input);
    const created = await prisma.commissionRule.create({
      data: {
        name: data.name,
        device_type: (data.device_type || null) as DeviceType | null,
        sla_tier: (data.sla_tier || null) as SlaTier | null,
        ticket_type: data.ticket_type as TicketType,
        base_fee: data.base_fee,
        bonus_ontime_fee: data.bonus_ontime_fee,
        penalty_breach_fee: data.penalty_breach_fee,
        is_active: data.is_active,
      },
    });
    revalidatePath("/admin/settings/commissions");
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal create" };
  }
}

export async function updateCommissionRule(
  id: string,
  input: z.infer<typeof ruleSchema>
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = ruleSchema.parse(input);
    await prisma.commissionRule.update({
      where: { id },
      data: {
        name: data.name,
        device_type: (data.device_type || null) as DeviceType | null,
        sla_tier: (data.sla_tier || null) as SlaTier | null,
        ticket_type: data.ticket_type as TicketType,
        base_fee: data.base_fee,
        bonus_ontime_fee: data.bonus_ontime_fee,
        penalty_breach_fee: data.penalty_breach_fee,
        is_active: data.is_active,
      },
    });
    revalidatePath("/admin/settings/commissions");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update" };
  }
}

export async function deleteCommissionRule(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.commissionRule.delete({ where: { id } });
    revalidatePath("/admin/settings/commissions");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus" };
  }
}

export async function createAdjustment(input: {
  engineer_id: string;
  amount: number;
  notes: string;
}): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    if (!input.notes || input.notes.trim().length < 5) {
      return { success: false, error: "Notes wajib minimal 5 karakter" };
    }
    if (!Number.isInteger(input.amount) || input.amount === 0) {
      return { success: false, error: "Amount harus bilangan bulat non-zero" };
    }

    await prisma.$transaction(async (tx) => {
      const engineer = await tx.user.findUnique({
        where: { id: input.engineer_id },
        select: { engagement_type: true, role: true },
      });
      if (!engineer || engineer.role !== "FIELD_ENGINEER") {
        throw new Error("Engineer tidak ditemukan");
      }
      if (engineer.engagement_type !== "MITRA") {
        throw new Error(
          "Adjustment wallet hanya untuk Mitra. PKWT memakai payroll HR."
        );
      }

      let wallet = await tx.engineerWallet.findUnique({
        where: { engineer_id: input.engineer_id },
      });
      if (!wallet) {
        wallet = await tx.engineerWallet.create({
          data: { engineer_id: input.engineer_id },
        });
      }
      await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          type: "ADJUSTMENT",
          amount: input.amount,
          description: input.notes.trim(),
          created_by: session.user.id,
        },
      });
      await tx.engineerWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: input.amount } },
      });
    });

    revalidatePath("/admin/payroll");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal adjustment" };
  }
}

// silence unused
void Prisma;
