"use server";

import { revalidatePath } from "next/cache";
import {
  Role,
  TicketStatus,
  TransactionType,
  WithdrawalStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils/rupiah";
import { sendWhatsApp } from "@/lib/whatsapp";
import { calculateMttrMinutes, calculateSlaMeetPercent } from "@/lib/sla";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getPayrollKpis() {
  await requireAdmin();
  const monthStart = startOfMonth();

  const [wallets, monthTx, pendingWithdrawals] = await Promise.all([
    prisma.engineerWallet.findMany(),
    prisma.walletTransaction.findMany({
      where: { created_at: { gte: monthStart } },
    }),
    prisma.withdrawal.aggregate({
      where: { status: WithdrawalStatus.PENDING },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const monthCommission = monthTx
    .filter((t) => t.type === TransactionType.EARN || t.type === TransactionType.BONUS)
    .reduce((s, t) => s + t.amount, 0);
  const monthPenalty = monthTx
    .filter((t) => t.type === TransactionType.PENALTY)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    total_balance: totalBalance,
    month_commission: monthCommission,
    pending_withdrawal_amount: pendingWithdrawals._sum.amount ?? 0,
    pending_withdrawal_count: pendingWithdrawals._count,
    month_penalty: monthPenalty,
  };
}

export async function getPayrollWallets() {
  await requireAdmin();
  const monthStart = startOfMonth();

  const engineers = await prisma.user.findMany({
    where: { role: Role.FIELD_ENGINEER },
    include: {
      wallet: true,
      assigned_tickets: {
        where: {
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          resolved_at: { gte: monthStart },
        },
        select: {
          id: true,
          created_at: true,
          resolved_at: true,
          sla_due_at: true,
          status: true,
        },
      },
    },
    orderBy: { full_name: "asc" },
  });

  return engineers.map((e) => ({
    id: e.id,
    full_name: e.full_name,
    phone: e.phone,
    city: e.city,
    balance: e.wallet?.balance ?? 0,
    total_earned: e.wallet?.total_earned ?? 0,
    total_penalty: e.wallet?.total_penalty ?? 0,
    total_withdrawn: e.wallet?.total_withdrawn ?? 0,
    tickets_month: e.assigned_tickets.length,
    mttr_minutes: calculateMttrMinutes(e.assigned_tickets),
    sla_meet_rate: calculateSlaMeetPercent(e.assigned_tickets),
  }));
}

export async function getPayrollTransactions(params: {
  from?: string;
  to?: string;
  engineer_id?: string;
  type?: string;
  q?: string;
}) {
  await requireAdmin();

  const where: {
    created_at?: { gte?: Date; lte?: Date };
    type?: TransactionType;
    wallet?: { engineer_id?: string };
    OR?: Array<Record<string, unknown>>;
  } = {};

  if (params.from || params.to) {
    where.created_at = {};
    if (params.from) where.created_at.gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }
  if (params.type && Object.values(TransactionType).includes(params.type as TransactionType)) {
    where.type = params.type as TransactionType;
  }
  if (params.engineer_id) {
    where.wallet = { engineer_id: params.engineer_id };
  }
  if (params.q?.trim()) {
    where.OR = [
      { description: { contains: params.q.trim(), mode: "insensitive" } },
      { ticket: { ticket_no: { contains: params.q.trim(), mode: "insensitive" } } },
    ];
  }

  const items = await prisma.walletTransaction.findMany({
    where,
    include: {
      wallet: {
        include: {
          engineer: { select: { id: true, full_name: true, phone: true } },
        },
      },
      ticket: { select: { ticket_no: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  return items.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    created_at: t.created_at.toISOString(),
    ticket_no: t.ticket?.ticket_no ?? null,
    engineer_name: t.wallet.engineer.full_name,
    engineer_id: t.wallet.engineer.id,
  }));
}

export async function getPayrollWithdrawals() {
  await requireAdmin();
  const items = await prisma.withdrawal.findMany({
    include: {
      engineer: { select: { id: true, full_name: true, phone: true } },
    },
    orderBy: { requested_at: "desc" },
    take: 100,
  });
  return items.map((w) => ({
    id: w.id,
    amount: w.amount,
    bank_name: w.bank_name,
    bank_account_no: w.bank_account_no,
    bank_account_name: w.bank_account_name,
    status: w.status,
    requested_at: w.requested_at.toISOString(),
    processed_at: w.processed_at?.toISOString() ?? null,
    notes: w.notes,
    engineer_name: w.engineer.full_name,
    engineer_phone: w.engineer.phone,
    engineer_id: w.engineer.id,
  }));
}

export async function approveWithdrawal(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const w = await prisma.withdrawal.findUnique({
      where: { id },
      include: { engineer: true },
    });
    if (!w) return { success: false, error: "Withdrawal tidak ditemukan" };
    if (w.status !== WithdrawalStatus.PENDING) {
      return { success: false, error: "Status bukan PENDING" };
    }

    await prisma.withdrawal.update({
      where: { id },
      data: {
        status: WithdrawalStatus.APPROVED,
        processed_at: new Date(),
        processed_by: session.user.id,
      },
    });

    void sendWhatsApp({
      phone: w.engineer.phone,
      message: `Permintaan penarikan ${formatRupiah(w.amount)} ke ${w.bank_name} ${w.bank_account_no} sudah DISETUJUI. Menunggu transfer.`,
    });

    revalidatePath("/admin/payroll");
    revalidatePath("/engineer/withdrawals");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal approve" };
  }
}

export async function rejectWithdrawal(
  id: string,
  notes?: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const w = await prisma.withdrawal.findUnique({
      where: { id },
      include: { engineer: true },
    });
    if (!w) return { success: false, error: "Withdrawal tidak ditemukan" };
    if (w.status !== WithdrawalStatus.PENDING && w.status !== WithdrawalStatus.APPROVED) {
      return { success: false, error: "Tidak bisa reject status ini" };
    }

    await prisma.withdrawal.update({
      where: { id },
      data: {
        status: WithdrawalStatus.REJECTED,
        processed_at: new Date(),
        processed_by: session.user.id,
        notes: notes || w.notes,
      },
    });

    void sendWhatsApp({
      phone: w.engineer.phone,
      message: `Permintaan penarikan ${formatRupiah(w.amount)} DITOLAK. ${notes ? `Alasan: ${notes}` : ""}`,
    });

    revalidatePath("/admin/payroll");
    revalidatePath("/engineer/withdrawals");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal reject" };
  }
}

export async function markWithdrawalPaid(id: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const w = await prisma.withdrawal.findUnique({
      where: { id },
      include: { engineer: true },
    });
    if (!w) return { success: false, error: "Withdrawal tidak ditemukan" };
    if (w.status !== WithdrawalStatus.APPROVED) {
      return { success: false, error: "Harus APPROVED dulu sebelum PAID" };
    }

    await prisma.$transaction(async (tx) => {
      let wallet = await tx.engineerWallet.findUnique({
        where: { engineer_id: w.engineer_id },
      });
      if (!wallet) {
        wallet = await tx.engineerWallet.create({
          data: { engineer_id: w.engineer_id },
        });
      }
      if (wallet.balance < w.amount) {
        throw new Error("Saldo engineer tidak mencukupi");
      }

      await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          type: TransactionType.WITHDRAW,
          amount: -w.amount,
          description: `Penarikan ke ${w.bank_name} ${w.bank_account_no}`,
          created_by: session.user.id,
        },
      });

      await tx.engineerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: w.amount },
          total_withdrawn: { increment: w.amount },
        },
      });

      await tx.withdrawal.update({
        where: { id },
        data: {
          status: WithdrawalStatus.PAID,
          processed_at: new Date(),
          processed_by: session.user.id,
        },
      });
    });

    void sendWhatsApp({
      phone: w.engineer.phone,
      message: `Penarikan ${formatRupiah(w.amount)} ke ${w.bank_name} ${w.bank_account_no} sudah DITRANSFER (PAID). Cek rekening kamu.`,
    });

    revalidatePath("/admin/payroll");
    revalidatePath("/engineer/wallet");
    revalidatePath("/engineer/withdrawals");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal mark paid" };
  }
}

export async function getPayrollReport(month: string) {
  await requireAdmin();
  // month = YYYY-MM
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59, 999);

  const engineers = await prisma.user.findMany({
    where: { role: Role.FIELD_ENGINEER },
    include: {
      wallet: {
        include: {
          transactions: {
            where: { created_at: { gte: from, lte: to } },
          },
        },
      },
      assigned_tickets: {
        where: {
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          resolved_at: { gte: from, lte: to },
        },
        select: {
          created_at: true,
          resolved_at: true,
          sla_due_at: true,
          status: true,
        },
      },
    },
    orderBy: { full_name: "asc" },
  });

  return engineers.map((e) => {
    const txs = e.wallet?.transactions ?? [];
    const total_fee = txs
      .filter((t) => t.type === TransactionType.EARN)
      .reduce((s, t) => s + t.amount, 0);
    const total_bonus = txs
      .filter((t) => t.type === TransactionType.BONUS)
      .reduce((s, t) => s + t.amount, 0);
    const total_penalty = txs
      .filter((t) => t.type === TransactionType.PENALTY)
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const total_dibayar = txs
      .filter((t) => t.type === TransactionType.WITHDRAW)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    return {
      engineer_name: e.full_name,
      phone: e.phone,
      jumlah_ticket_closed: e.assigned_tickets.length,
      total_fee,
      total_bonus,
      total_penalty,
      total_dibayar,
      mttr_minutes: calculateMttrMinutes(e.assigned_tickets),
      sla_meet_rate: calculateSlaMeetPercent(e.assigned_tickets),
    };
  });
}
