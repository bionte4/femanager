"use server";

import { revalidatePath } from "next/cache";
import { Role, TransactionType, WithdrawalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils/rupiah";
import { BANKS, MIN_WITHDRAWAL } from "@/lib/wallet-constants";

async function requireEngineer() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
    throw new Error("Unauthorized");
  }
  return session;
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function getMyWallet() {
  const session = await requireEngineer();
  let wallet = await prisma.engineerWallet.findUnique({
    where: { engineer_id: session.user.id },
  });
  if (!wallet) {
    wallet = await prisma.engineerWallet.create({
      data: { engineer_id: session.user.id },
    });
  }

  const [transactions, bonusSum, pendingCount] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { wallet_id: wallet.id },
      include: { ticket: { select: { ticket_no: true } } },
      orderBy: { created_at: "desc" },
      take: 50,
    }),
    prisma.walletTransaction.aggregate({
      where: { wallet_id: wallet.id, type: TransactionType.BONUS },
      _sum: { amount: true },
    }),
    prisma.ticket.count({
      where: {
        assigned_engineer_id: session.user.id,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
  ]);

  return {
    balance: wallet.balance,
    total_earned: wallet.total_earned,
    total_withdrawn: wallet.total_withdrawn,
    total_penalty: wallet.total_penalty,
    total_bonus: bonusSum._sum.amount ?? 0,
    active_tickets: pendingCount,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      ticket_no: t.ticket?.ticket_no ?? null,
      created_at: t.created_at.toISOString(),
    })),
  };
}

const withdrawSchema = z.object({
  amount: z.coerce.number().int().min(MIN_WITHDRAWAL),
  bank_name: z.enum(BANKS),
  bank_account_no: z.string().min(5).max(30),
  bank_account_name: z.string().min(3).max(100),
});

export async function requestWithdrawal(
  input: z.infer<typeof withdrawSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireEngineer();
    const data = withdrawSchema.parse(input);

    const wallet = await prisma.engineerWallet.findUnique({
      where: { engineer_id: session.user.id },
    });
    if (!wallet || wallet.balance < data.amount) {
      return { success: false, error: "Saldo tidak mencukupi" };
    }

    const pending = await prisma.withdrawal.findFirst({
      where: {
        engineer_id: session.user.id,
        status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED] },
      },
    });
    if (pending) {
      return {
        success: false,
        error: "Masih ada permintaan penarikan yang belum selesai",
      };
    }

    const created = await prisma.withdrawal.create({
      data: {
        engineer_id: session.user.id,
        amount: data.amount,
        bank_name: data.bank_name,
        bank_account_no: data.bank_account_no,
        bank_account_name: data.bank_account_name,
        status: WithdrawalStatus.PENDING,
      },
    });

    revalidatePath("/engineer/wallet");
    revalidatePath("/engineer/withdrawals");
    revalidatePath("/admin/payroll");
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal request withdrawal",
    };
  }
}

export async function getMyWithdrawals() {
  const session = await requireEngineer();
  const items = await prisma.withdrawal.findMany({
    where: { engineer_id: session.user.id },
    orderBy: { requested_at: "desc" },
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
    amount_label: formatRupiah(w.amount),
  }));
}
