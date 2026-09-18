"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CommissionRule, DeviceType, SlaTier, TicketType } from "@prisma/client";
import {
  createCommissionRule,
  deleteCommissionRule,
  updateCommissionRule,
} from "@/app/actions/commissions";
import { formatRupiah } from "@/lib/utils/rupiah";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormState = {
  name: string;
  device_type: string;
  sla_tier: string;
  ticket_type: TicketType;
  base_fee: string;
  bonus_ontime_fee: string;
  penalty_breach_fee: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  device_type: "all",
  sla_tier: "all",
  ticket_type: "INCIDENT",
  base_fee: "75000",
  bonus_ontime_fee: "15000",
  penalty_breach_fee: "-25000",
  is_active: true,
};

export function CommissionsTable({ items }: { items: CommissionRule[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: CommissionRule) {
    setEditing(row);
    setForm({
      name: row.name,
      device_type: row.device_type ?? "all",
      sla_tier: row.sla_tier ?? "all",
      ticket_type: row.ticket_type,
      base_fee: String(row.base_fee),
      bonus_ontime_fee: String(row.bonus_ontime_fee),
      penalty_breach_fee: String(row.penalty_breach_fee),
      is_active: row.is_active,
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name: form.name,
      device_type: (form.device_type === "all" ? "" : form.device_type) as
        | ""
        | "EDC_BCA"
        | "EDC_BRI"
        | "ROUTER"
        | "SWITCH",
      sla_tier: (form.sla_tier === "all" ? "" : form.sla_tier) as
        | ""
        | "TIER1_JABODETABEK"
        | "TIER2_PROVINCE"
        | "TIER3_KABUPATEN",
      ticket_type: form.ticket_type,
      base_fee: Number(form.base_fee),
      bonus_ontime_fee: Number(form.bonus_ontime_fee),
      penalty_breach_fee: Number(form.penalty_breach_fee),
      is_active: form.is_active,
    };
    const result = editing
      ? await updateCommissionRule(editing.id, payload)
      : await createCommissionRule(payload);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Rule diupdate" : "Rule ditambahkan");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus rule "${name}"?`)) return;
    const result = await deleteCommissionRule(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Rule dihapus");
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Rule paling spesifik dipakai dulu (device + tier). Jika tidak cocok, pakai
        rule general (device_type & sla_tier kosong).
      </div>

      <div className="mb-2 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Rule
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Belum ada rule komisi" description="Tambah rule fee per ticket." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.device_type ?? "Semua"}</TableCell>
                  <TableCell className="text-xs">{r.sla_tier ?? "Semua"}</TableCell>
                  <TableCell>{r.ticket_type}</TableCell>
                  <TableCell className="text-emerald-700">{formatRupiah(r.base_fee)}</TableCell>
                  <TableCell className="text-sky-700">
                    {formatRupiah(r.bonus_ontime_fee)}
                  </TableCell>
                  <TableCell className="text-rose-700">
                    {formatRupiah(r.penalty_breach_fee)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "success" : "secondary"}>
                      {r.is_active ? "Aktif" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r.id, r.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rule" : "Tambah Rule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Device type</Label>
              <Select
                value={form.device_type}
                onValueChange={(v) => setForm((f) => ({ ...f, device_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {(["EDC_BCA", "EDC_BRI", "ROUTER", "SWITCH"] as DeviceType[]).map(
                    (d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SLA Tier</Label>
              <Select
                value={form.sla_tier}
                onValueChange={(v) => setForm((f) => ({ ...f, sla_tier: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {(
                    [
                      "TIER1_JABODETABEK",
                      "TIER2_PROVINCE",
                      "TIER3_KABUPATEN",
                    ] as SlaTier[]
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ticket type</Label>
              <Select
                value={form.ticket_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, ticket_type: v as TicketType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCIDENT">INCIDENT</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                  <SelectItem value="CM">CM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Base fee (Rp)</Label>
              <Input
                type="number"
                value={form.base_fee}
                onChange={(e) => setForm((f) => ({ ...f, base_fee: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bonus ontime (Rp)</Label>
              <Input
                type="number"
                value={form.bonus_ontime_fee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bonus_ontime_fee: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Penalty breach (Rp, negatif)</Label>
              <Input
                type="number"
                value={form.penalty_breach_fee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, penalty_breach_fee: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button className="w-full" disabled={saving} onClick={handleSave}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
