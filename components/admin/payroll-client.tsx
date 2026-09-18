"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveWithdrawal,
  markWithdrawalPaid,
  rejectWithdrawal,
  getPayrollReport,
} from "@/app/actions/payroll";
import { formatRupiah } from "@/lib/utils/rupiah";
import { formatMttr } from "@/lib/sla";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

type Kpis = {
  total_balance: number;
  month_commission: number;
  pending_withdrawal_amount: number;
  pending_withdrawal_count: number;
  month_penalty: number;
};

type WalletRow = {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  engagement_type?: string;
  balance: number;
  total_earned: number;
  total_penalty: number;
  total_withdrawn: number;
  tickets_month: number;
  mttr_minutes: number;
  sla_meet_rate: number;
};

type TxRow = {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  ticket_no: string | null;
  engineer_name: string;
  engineer_id: string;
};

type WdRow = {
  id: string;
  amount: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  status: string;
  requested_at: string;
  engineer_name: string;
  engineer_phone: string;
  engineer_id: string;
  notes: string | null;
};

const TABS = ["wallets", "transactions", "withdrawals", "report"] as const;

export function PayrollClient({
  kpis,
  wallets,
  transactions,
  withdrawals,
}: {
  kpis: Kpis;
  wallets: WalletRow[];
  transactions: TxRow[];
  withdrawals: WdRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("wallets");
  const [busy, setBusy] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pending, startTransition] = useTransition();

  const pendingWd = useMemo(
    () => withdrawals.filter((w) => w.status === "PENDING" || w.status === "APPROVED"),
    [withdrawals]
  );

  async function handleApprove(id: string) {
    setBusy(id);
    const r = await approveWithdrawal(id);
    setBusy(null);
    if (!r.success) return toast.error(r.error);
    toast.success("Withdrawal di-approve");
    router.refresh();
  }

  async function handleReject(id: string) {
    const notes = prompt("Alasan reject (opsional)") ?? undefined;
    setBusy(id);
    const r = await rejectWithdrawal(id, notes);
    setBusy(null);
    if (!r.success) return toast.error(r.error);
    toast.success("Withdrawal ditolak");
    router.refresh();
  }

  async function handlePaid(id: string) {
    if (!confirm("Sudah transfer? Saldo engineer akan dipotong.")) return;
    setBusy(id);
    const r = await markWithdrawalPaid(id);
    setBusy(null);
    if (!r.success) return toast.error(r.error);
    toast.success("Ditandai PAID");
    router.refresh();
  }

  async function exportReport() {
    startTransition(async () => {
      const XLSX = await import("xlsx");
      const rows = await getPayrollReport(month);
      const data = rows.map((r) => ({
        engineer_name: r.engineer_name,
        phone: r.phone,
        jumlah_ticket_closed: r.jumlah_ticket_closed,
        total_fee: r.total_fee,
        total_bonus: r.total_bonus,
        total_penalty: r.total_penalty,
        total_dibayar: r.total_dibayar,
        MTTR: formatMttr(r.mttr_minutes),
        sla_meet_rate: r.sla_meet_rate,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payroll");
      XLSX.writeFile(wb, `fetrack-payroll-${month}.xlsx`);
      toast.success("Excel diexport");
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Total Saldo Engineer" value={formatRupiah(kpis.total_balance)} />
        <Kpi
          title="Komisi Bulan Ini"
          value={formatRupiah(kpis.month_commission)}
          tone="ok"
        />
        <Kpi
          title="Pending Withdrawal"
          value={formatRupiah(kpis.pending_withdrawal_amount)}
          hint={`${kpis.pending_withdrawal_count} request`}
          tone="warn"
        />
        <Kpi
          title="Denda Bulan Ini"
          value={formatRupiah(kpis.month_penalty)}
          tone="bad"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "wallets" && "Wallet Engineer"}
            {t === "transactions" && "Transaksi"}
            {t === "withdrawals" && `Withdrawal (${pendingWd.length})`}
            {t === "report" && "Laporan Payroll"}
          </Button>
        ))}
      </div>

      {tab === "wallets" && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet Engineer</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Withdrawn</TableHead>
                  <TableHead>Ticket bln ini</TableHead>
                  <TableHead>MTTR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <Link
                        href={`/admin/engineers/${w.id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {w.full_name}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <p className="text-xs text-muted-foreground">{w.city}</p>
                        {w.engagement_type && w.engagement_type !== "MITRA" && (
                          <Badge variant="secondary" className="text-[10px]">
                            {w.engagement_type === "PKWT_INTERNAL"
                              ? "PKWT Internal"
                              : "PKWT"}{" "}
                            · sisa saldo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-700">
                      {formatRupiah(w.balance)}
                    </TableCell>
                    <TableCell>{formatRupiah(w.total_earned)}</TableCell>
                    <TableCell className="text-rose-700">
                      {formatRupiah(w.total_penalty)}
                    </TableCell>
                    <TableCell>{formatRupiah(w.total_withdrawn)}</TableCell>
                    <TableCell>{w.tickets_month}</TableCell>
                    <TableCell className="text-xs">{formatMttr(w.mttr_minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "transactions" && (
        <Card>
          <CardHeader>
            <CardTitle>Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState title="Belum ada transaksi" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Deskripsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(t.created_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>{t.engineer_name}</TableCell>
                      <TableCell>
                        <TxBadge type={t.type} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {t.ticket_no ?? "—"}
                      </TableCell>
                      <TableCell
                        className={
                          t.amount >= 0 ? "text-emerald-700 font-medium" : "text-rose-700 font-medium"
                        }
                      >
                        {formatRupiah(t.amount)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs">
                        {t.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "withdrawals" && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Request</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <EmptyState title="Belum ada permintaan penarikan" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <p className="font-medium">{w.engineer_name}</p>
                        <p className="text-xs text-muted-foreground">{w.engineer_phone}</p>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatRupiah(w.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {w.bank_name}
                        <br />
                        {w.bank_account_no}
                        <br />
                        {w.bank_account_name}
                      </TableCell>
                      <TableCell>
                        <WdBadge status={w.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(w.requested_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {w.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                disabled={!!busy}
                                onClick={() => handleApprove(w.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!busy}
                                onClick={() => handleReject(w.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {w.status === "APPROVED" && (
                            <Button
                              size="sm"
                              disabled={!!busy}
                              onClick={() => handlePaid(w.id)}
                            >
                              Mark PAID
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "report" && (
        <Card>
          <CardHeader>
            <CardTitle>Laporan Payroll</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Bulan</p>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={exportReport} disabled={pending}>
              {pending ? "Exporting..." : "Export Excel"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <Card
      className={
        tone === "ok"
          ? "border-emerald-200 bg-emerald-50/40"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50/40"
            : tone === "bad"
              ? "border-rose-200 bg-rose-50/40"
              : ""
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function TxBadge({ type }: { type: string }) {
  const map: Record<string, "success" | "default" | "destructive" | "secondary" | "warning"> = {
    EARN: "success",
    BONUS: "default",
    PENALTY: "destructive",
    WITHDRAW: "secondary",
    ADJUSTMENT: "warning",
  };
  return <Badge variant={map[type] ?? "secondary"}>{type}</Badge>;
}

function WdBadge({ status }: { status: string }) {
  const map: Record<string, "warning" | "default" | "success" | "destructive"> = {
    PENDING: "warning",
    APPROVED: "default",
    PAID: "success",
    REJECTED: "destructive",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
}
