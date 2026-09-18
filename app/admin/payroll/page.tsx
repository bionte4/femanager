import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getPayrollKpis,
  getPayrollTransactions,
  getPayrollWallets,
  getPayrollWithdrawals,
} from "@/app/actions/payroll";
import { PayrollClient } from "@/components/admin/payroll-client";

export default async function AdminPayrollPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const [kpis, wallets, transactions, withdrawals] = await Promise.all([
    getPayrollKpis(),
    getPayrollWallets(),
    getPayrollTransactions({}),
    getPayrollWithdrawals(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-xs text-muted-foreground">
          Wallet engineer, transaksi komisi, dan approval penarikan.
        </p>
      </div>
      <PayrollClient
        kpis={kpis}
        wallets={wallets}
        transactions={transactions}
        withdrawals={withdrawals}
      />
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Fee ini adalah pendapatan kemitraan, bukan upah kerja. Tidak termasuk
        BPJS TK, THR, dan pesangon sesuai Perjanjian Kemitraan yang berlaku.
        Mitra bebas menolak job dan bekerja di tempat lain.
      </p>
    </div>
  );
}
