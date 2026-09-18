"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { requestWithdrawal } from "@/app/actions/wallet";
import { BANKS, MIN_WITHDRAWAL } from "@/lib/wallet-constants";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

type Tx = {
  id: string;
  type: string;
  amount: number;
  description: string;
  ticket_no: string | null;
  created_at: string;
};

type Props = {
  balance: number;
  total_withdrawn: number;
  total_bonus: number;
  total_penalty: number;
  active_tickets: number;
  transactions: Tx[];
};

export function EngineerWalletClient(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: String(Math.min(props.balance, MIN_WITHDRAWAL)),
    bank_name: "BCA",
    bank_account_no: "",
    bank_account_name: "",
  });

  async function handleWithdraw() {
    setSaving(true);
    const result = await requestWithdrawal({
      amount: Number(form.amount),
      bank_name: form.bank_name as (typeof BANKS)[number],
      bank_account_no: form.bank_account_no,
      bank_account_name: form.bank_account_name,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Permintaan penarikan dikirim");
    setOpen(false);
    router.refresh();
  }

  const needForBonus = Math.max(0, 3 - props.active_tickets);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <p className="text-sm font-medium text-emerald-100">Saldo Saat Ini</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">
          {formatRupiah(props.balance)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="lg"
            className="h-12 flex-1 bg-white text-emerald-800 hover:bg-emerald-50"
            onClick={() => setOpen(true)}
            disabled={props.balance < MIN_WITHDRAWAL}
          >
            <Wallet className="h-5 w-5" />
            Tarik Saldo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/40 bg-white/10 text-white hover:bg-white/20"
            asChild
          >
            <Link href="/engineer/withdrawals">History Tarik</Link>
          </Button>
        </div>
        {props.balance < MIN_WITHDRAWAL && (
          <p className="mt-2 text-xs text-emerald-100">
            Minimal penarikan {formatRupiah(MIN_WITHDRAWAL)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniCard
          label="Dicairkan"
          value={formatRupiah(props.total_withdrawn)}
        />
        <MiniCard label="Bonus" value={formatRupiah(props.total_bonus)} tone="ok" />
        <MiniCard
          label="Denda"
          value={formatRupiah(props.total_penalty)}
          tone="bad"
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Selesaikan {needForBonus > 0 ? `${needForBonus} ticket lagi` : "ticket"} sebelum
        50% SLA untuk dapat bonus Rp 15.000!
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Mutasi</h2>
        {props.transactions.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Komisi muncul otomatis saat ticket RESOLVED."
          />
        ) : (
          <ul className="space-y-2">
            {props.transactions.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl border bg-card px-3 py-3"
              >
                <TxIcon type={t.type} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.ticket_no ? `${t.ticket_no} · ` : ""}
                    {new Date(t.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-bold ${
                    t.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatRupiah(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarik Saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Jumlah (max {formatRupiah(props.balance)})</Label>
              <Input
                type="number"
                min={MIN_WITHDRAWAL}
                max={props.balance}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bank / E-Wallet</Label>
              <Select
                value={form.bank_name}
                onValueChange={(v) => setForm((f) => ({ ...f, bank_name: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>No. rekening / HP</Label>
              <Input
                value={form.bank_account_no}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bank_account_no: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama pemilik</Label>
              <Input
                value={form.bank_account_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bank_account_name: e.target.value }))
                }
              />
            </div>
            <Button className="h-12 w-full" disabled={saving} onClick={handleWithdraw}>
              {saving ? "Mengirim..." : "Ajukan Penarikan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-3 text-center ${
        tone === "ok"
          ? "border-sky-200 bg-sky-50"
          : tone === "bad"
            ? "border-rose-200 bg-rose-50"
            : "bg-card"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-tight">{value}</p>
    </div>
  );
}

function TxIcon({ type }: { type: string }) {
  const wrap = "flex h-10 w-10 items-center justify-center rounded-full";
  if (type === "EARN")
    return (
      <div className={`${wrap} bg-emerald-100 text-emerald-700`}>
        <ArrowDownLeft className="h-5 w-5" />
      </div>
    );
  if (type === "BONUS")
    return (
      <div className={`${wrap} bg-sky-100 text-sky-700`}>
        <Gift className="h-5 w-5" />
      </div>
    );
  if (type === "PENALTY")
    return (
      <div className={`${wrap} bg-rose-100 text-rose-700`}>
        <AlertTriangle className="h-5 w-5" />
      </div>
    );
  return (
    <div className={`${wrap} bg-slate-100 text-slate-600`}>
      <ArrowUpRight className="h-5 w-5" />
    </div>
  );
}
