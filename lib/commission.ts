import {
  DeviceType,
  SlaTier,
  TicketStatus,
  TicketType,
  TransactionType,
  type Ticket,
  type Tenant,
  type Device,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils/rupiah";
import { sendWhatsApp } from "@/lib/whatsapp";
import { isMitraEngagement } from "@/lib/eligibility";

export type CommissionBreakdown = {
  base_fee: number;
  bonus: number;
  penalty: number;
  total: number;
  rule_id: string | null;
  rule_name: string | null;
  is_ontime: boolean;
  is_fast: boolean;
};

type TicketForCommission = Ticket & {
  tenant: Pick<Tenant, "sla_tier">;
  device: Pick<Device, "type" | "service_category_id"> | null;
  service_category?: {
    id: string;
    code: string;
    base_fee_tier1: number;
    base_fee_tier2: number;
    base_fee_tier3: number;
  } | null;
  service_package?: {
    id: string;
    name: string;
    fee_engineer: number;
  } | null;
};

/**
 * Skor spesifisitas rule: device+tier = 2, salah satu = 1, general = 0
 */
function ruleScore(
  rule: { device_type: DeviceType | null; sla_tier: SlaTier | null },
  deviceType: DeviceType | null,
  slaTier: SlaTier
): number | null {
  // Device rule harus cocok jika ticket punya device
  if (rule.device_type != null && deviceType != null && rule.device_type !== deviceType) {
    return null;
  }
  // Jika ticket tanpa device, skip rule yang spesifik device (pakai general)
  if (rule.device_type != null && deviceType == null) {
    return null;
  }
  if (rule.sla_tier != null && rule.sla_tier !== slaTier) {
    return null;
  }

  let score = 0;
  if (rule.device_type != null) score += 1;
  if (rule.sla_tier != null) score += 1;
  return score;
}

/**
 * Cari rule paling spesifik untuk ticket.
 * EDC_BCA/EDC_BRI cocok dengan rule device_type EDC_BCA atau EDC_BRI; juga coba match "family" via name prefix.
 */
export async function findBestCommissionRule(ticket: TicketForCommission) {
  const rules = await prisma.commissionRule.findMany({
    where: {
      is_active: true,
      ticket_type: ticket.type,
    },
  });

  const deviceType = ticket.device?.type ?? null;
  const slaTier = ticket.tenant.sla_tier;

  let best: (typeof rules)[number] | null = null;
  let bestScore = -1;

  for (const rule of rules) {
    const score = ruleScore(rule, deviceType, slaTier);
    if (score == null) continue;
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  // Fallback: rule PM/CM/INCIDENT general (device & tier null) sudah tercakup di atas.
  // Jika device EDC_* dan rule pakai ROUTER tidak match — ok.
  // Extra: jika tidak ketemu dan device EDC, coba rule EDC_BCA sebagai proxy untuk EDC family
  if (!best && deviceType?.startsWith("EDC")) {
    for (const rule of rules) {
      if (rule.device_type?.startsWith("EDC")) {
        const score = ruleScore(
          { device_type: null, sla_tier: rule.sla_tier },
          null,
          slaTier
        );
        // Manual: allow EDC_BCA rule for EDC_BRI if tier matches
        if (rule.sla_tier != null && rule.sla_tier !== slaTier) continue;
        const s = (rule.sla_tier != null ? 1 : 0) + 1;
        if (s > bestScore) {
          bestScore = s;
          best = rule;
        }
      }
    }
  }

  return best;
}

export async function calculateCommission(
  ticket: TicketForCommission
): Promise<CommissionBreakdown> {
  const isOntime =
    !ticket.sla_due_at ||
    !ticket.resolved_at ||
    ticket.resolved_at.getTime() <= ticket.sla_due_at.getTime();

  const slaMs = ticket.sla_due_at
    ? ticket.sla_due_at.getTime() - ticket.created_at.getTime()
    : 0;
  const dur = ticket.resolved_at
    ? ticket.resolved_at.getTime() - ticket.created_at.getTime()
    : 0;
  const isFast = slaMs > 0 && dur > 0 && dur <= slaMs * 0.5;

  // 1) ServicePackage fee_engineer prioritas
  if (ticket.service_package) {
    const base = ticket.service_package.fee_engineer;
    const bonus = isOntime ? Math.round(base * 0.1) : 0;
    const penalty = !isOntime ? -Math.round(base * 0.15) : 0;
    return {
      base_fee: base,
      bonus,
      penalty,
      total: base + bonus + penalty,
      rule_id: ticket.service_package.id,
      rule_name: ticket.service_package.name,
      is_ontime: isOntime,
      is_fast: isFast,
    };
  }

  // 2) ServiceCategory base fee by tier
  let category = ticket.service_category ?? null;
  if (!category && (ticket.service_category_id || ticket.device?.service_category_id)) {
    category = await prisma.serviceCategory.findUnique({
      where: {
        id:
          ticket.service_category_id ??
          ticket.device!.service_category_id!,
      },
      select: {
        id: true,
        code: true,
        base_fee_tier1: true,
        base_fee_tier2: true,
        base_fee_tier3: true,
      },
    });
  }

  if (category) {
    const { feeForTier } = await import("@/lib/service-categories");
    const base = feeForTier(category, ticket.tenant.sla_tier);
    const bonus = isOntime ? Math.round(base * 0.12) : 0;
    const penalty = !isOntime ? -Math.round(base * 0.2) : 0;
    return {
      base_fee: base,
      bonus,
      penalty,
      total: base + bonus + penalty,
      rule_id: category.id,
      rule_name: `Category ${category.code}`,
      is_ontime: isOntime,
      is_fast: isFast,
    };
  }

  const rule = await findBestCommissionRule(ticket);

  if (!rule) {
    return {
      base_fee: 0,
      bonus: 0,
      penalty: 0,
      total: 0,
      rule_id: null,
      rule_name: null,
      is_ontime: isOntime,
      is_fast: isFast,
    };
  }

  const base = rule.base_fee;
  const bonus = isOntime ? rule.bonus_ontime_fee : 0;
  const penalty = !isOntime ? rule.penalty_breach_fee : 0;

  return {
    base_fee: base,
    bonus,
    penalty,
    total: base + bonus + penalty,
    rule_id: rule.id,
    rule_name: rule.name,
    is_ontime: isOntime,
    is_fast: isFast,
  };
}

/**
 * Proses komisi ke wallet engineer (atomic, sekali saja).
 */
export async function processCommissionForTicket(ticketId: string): Promise<{
  success: boolean;
  skipped?: boolean;
  total?: number;
  error?: string;
}> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenant: { select: { sla_tier: true } },
        device: { select: { type: true, service_category_id: true } },
        service_category: {
          select: {
            id: true,
            code: true,
            base_fee_tier1: true,
            base_fee_tier2: true,
            base_fee_tier3: true,
          },
        },
        service_package: {
          select: { id: true, name: true, fee_engineer: true },
        },
        assigned_engineer: {
          select: {
            id: true,
            phone: true,
            full_name: true,
            engagement_type: true,
          },
        },
      },
    });

    if (!ticket) return { success: false, error: "Ticket tidak ditemukan" };

    if (
      ticket.status !== TicketStatus.RESOLVED &&
      ticket.status !== TicketStatus.CLOSED
    ) {
      return { success: false, error: "Status harus RESOLVED/CLOSED" };
    }

    if (ticket.commission_calculated) {
      return { success: true, skipped: true, total: ticket.commission_amount ?? 0 };
    }

    if (!ticket.assigned_engineer_id || !ticket.assigned_engineer) {
      return { success: false, error: "Tidak ada engineer assigned" };
    }

    // PKWT / non-MITRA: isolasi wallet — tandai calculated agar tidak di-retry
    if (!isMitraEngagement(ticket.assigned_engineer.engagement_type)) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          commission_calculated: true,
          commission_amount: 0,
        },
      });
      return { success: true, skipped: true, total: 0 };
    }

    const breakdown = await calculateCommission(ticket);
    // Jangan tandai calculated jika 0 karena no rule — biarkan retry setelah rule ditambah
  if (!breakdown.rule_id && breakdown.base_fee === 0) {
    return { success: false, error: "Tidak ada commission rule yang cocok" };
  }

    const engineerId = ticket.assigned_engineer_id;
    const ticketNo = ticket.ticket_no;

    const result = await prisma.$transaction(async (tx) => {
      // Double-check lock
      const fresh = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!fresh || fresh.commission_calculated) {
        return { skipped: true as const, balance: 0, total: fresh?.commission_amount ?? 0 };
      }

      let wallet = await tx.engineerWallet.findUnique({
        where: { engineer_id: engineerId },
      });
      if (!wallet) {
        wallet = await tx.engineerWallet.create({
          data: { engineer_id: engineerId },
        });
      }

      if (breakdown.base_fee !== 0) {
        await tx.walletTransaction.create({
          data: {
            wallet_id: wallet.id,
            ticket_id: ticketId,
            type: TransactionType.EARN,
            amount: breakdown.base_fee,
            description: `Fee ticket ${ticketNo}${breakdown.rule_name ? ` · ${breakdown.rule_name}` : ""}`,
          },
        });
      }

      if (breakdown.bonus > 0) {
        await tx.walletTransaction.create({
          data: {
            wallet_id: wallet.id,
            ticket_id: ticketId,
            type: TransactionType.BONUS,
            amount: breakdown.bonus,
            description: `Bonus ontime <50% SLA · ${ticketNo}`,
          },
        });
      }

      if (breakdown.penalty !== 0) {
        await tx.walletTransaction.create({
          data: {
            wallet_id: wallet.id,
            ticket_id: ticketId,
            type: TransactionType.PENALTY,
            amount: breakdown.penalty,
            description: `Denda breach SLA · ${ticketNo}`,
          },
        });
      }

      const earnedPositive = breakdown.base_fee + Math.max(0, breakdown.bonus);
      const penaltyAbs = breakdown.penalty < 0 ? Math.abs(breakdown.penalty) : 0;

      const updatedWallet = await tx.engineerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: breakdown.total },
          total_earned: { increment: earnedPositive },
          total_penalty: { increment: penaltyAbs },
        },
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          commission_calculated: true,
          commission_amount: breakdown.total,
        },
      });

      return {
        skipped: false as const,
        balance: updatedWallet.balance,
        total: breakdown.total,
      };
    });

    if (!result.skipped && ticket.assigned_engineer) {
      const bonusNote = breakdown.bonus > 0 ? " Dapat bonus ontime!" : "";
      const msg = `Selamat! Komisi ${formatRupiah(result.total)} untuk ticket ${ticketNo} sudah masuk wallet. Saldo sekarang ${formatRupiah(result.balance)}.${bonusNote}`;
      void sendWhatsApp({ phone: ticket.assigned_engineer.phone, message: msg });
    }

    return { success: true, skipped: result.skipped, total: result.total };
  } catch (e) {
    console.error("[commission]", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal proses komisi",
    };
  }
}

/** Helper device family untuk seed/UI grouping */
export function isEdcType(type: DeviceType | string | null | undefined): boolean {
  return !!type && String(type).startsWith("EDC");
}

export function isLanWanType(type: DeviceType | string | null | undefined): boolean {
  return type === DeviceType.ROUTER || type === DeviceType.SWITCH;
}
