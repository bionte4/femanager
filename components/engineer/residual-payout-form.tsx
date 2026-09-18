"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestResidualPayout } from "@/app/actions/wallet";
import { BANKS } from "@/lib/wallet-constants";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ResidualPayoutForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(String(balance));
  const [bank, setBank] = useState<string>(BANKS[0]);
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");

  async function submit() {
    setBusy(true);
    const res = await requestResidualPayout({
      amount: Number(amount),
      bank_name: bank as (typeof BANKS)[number],
      bank_account_no: accountNo,
      bank_account_name: accountName,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Permintaan pencairan residual dikirim");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <p className="text-sm font-medium">Ajukan pencairan sisa saldo</p>
      <p className="text-xs text-muted-foreground">
        Saldo tersedia: {formatRupiah(balance)}. Admin akan approve lalu transfer.
      </p>
      <div className="grid gap-2">
        <div className="space-y-1">
          <Label>Jumlah</Label>
          <Input
            type="number"
            min={1}
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Bank</Label>
          <Select value={bank} onValueChange={setBank}>
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
        <div className="space-y-1">
          <Label>No. rekening</Label>
          <Input
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            placeholder="1234567890"
          />
        </div>
        <div className="space-y-1">
          <Label>Nama rekening</Label>
          <Input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Sesuai KTP"
          />
        </div>
        <Button
          className="w-full"
          disabled={busy || !accountNo || accountName.length < 3}
          onClick={() => void submit()}
        >
          {busy ? "Mengirim…" : "Ajukan pencairan"}
        </Button>
      </div>
    </div>
  );
}
