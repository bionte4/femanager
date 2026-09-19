"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { LocationType, SparepartMutationType } from "@prisma/client";
import {
  createSparepart,
  deleteSparepart,
  getSparepartMutations,
  updateSparepart,
} from "@/app/actions/spareparts";
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

type SparepartRow = {
  id: string;
  name: string;
  sku: string;
  stock_qty: number;
  location_type: LocationType;
  warehouse_id: string | null;
  holder_id: string | null;
  holder: { id: string; full_name: string; phone: string } | null;
  warehouse: {
    id: string;
    code: string;
    name: string;
    city: string | null;
  } | null;
};

type EngineerOption = { id: string; full_name: string };
type WarehouseOption = {
  id: string;
  code: string;
  name: string;
  city: string | null;
};

type MutationRow = {
  id: string;
  type: SparepartMutationType;
  qty: number;
  stock_before: number;
  stock_after: number;
  notes: string | null;
  created_at: Date | string;
  user: { id: string; full_name: string } | null;
  ticket: { id: string; ticket_no: string } | null;
};

export function SparepartsTable({
  items,
  engineers,
  warehouses,
}: {
  items: SparepartRow[];
  engineers: EngineerOption[];
  warehouses: WarehouseOption[];
}) {
  const router = useRouter();
  const defaultWh = warehouses[0]?.id ?? "";
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SparepartRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    stock_qty: "0",
    location_type: "WAREHOUSE" as LocationType,
    warehouse_id: defaultWh,
    holder_id: "",
  });
  const [historyFor, setHistoryFor] = useState<SparepartRow | null>(null);
  const [mutations, setMutations] = useState<MutationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      stock_qty: "10",
      location_type: "WAREHOUSE",
      warehouse_id: defaultWh,
      holder_id: "",
    });
    setOpen(true);
  }

  function openEdit(row: SparepartRow) {
    setEditing(row);
    setForm({
      name: row.name,
      sku: row.sku,
      stock_qty: String(row.stock_qty),
      location_type: row.location_type,
      warehouse_id: row.warehouse_id ?? defaultWh,
      holder_id: row.holder_id ?? "",
    });
    setOpen(true);
  }

  async function openHistory(row: SparepartRow) {
    setHistoryFor(row);
    setHistoryLoading(true);
    try {
      const rows = await getSparepartMutations(row.id);
      setMutations(rows);
    } catch {
      toast.error("Gagal load mutasi");
      setMutations([]);
    }
    setHistoryLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      stock_qty: Number(form.stock_qty),
      location_type: form.location_type,
      warehouse_id:
        form.location_type === "WAREHOUSE" ? form.warehouse_id || null : null,
      holder_id:
        form.location_type === "ENGINEER" ? form.holder_id || null : null,
    };
    const result = editing
      ? await updateSparepart(editing.id, payload)
      : await createSparepart(payload);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Sparepart diupdate" : "Sparepart ditambahkan");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus sparepart "${name}"?`)) return;
    const result = await deleteSparepart(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Sparepart dihapus");
    router.refresh();
  }

  function locationLabel(s: SparepartRow) {
    if (s.location_type === "ENGINEER") {
      return s.holder?.full_name ? `Engineer · ${s.holder.full_name}` : "Engineer";
    }
    if (s.warehouse) {
      return `${s.warehouse.code}${s.warehouse.city ? ` · ${s.warehouse.city}` : ""}`;
    }
    return "Warehouse";
  }

  return (
    <>
      <div className="mb-2 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Sparepart
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada sparepart"
          description="Catat stok EDC, router, kabel di gudang atau di engineer."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tambah pertama
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                  <TableCell>
                    <Badge
                      variant={s.stock_qty <= 2 ? "destructive" : "secondary"}
                    >
                      {s.stock_qty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{locationLabel(s)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Riwayat mutasi"
                        onClick={() => openHistory(s)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id, s.name)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Sparepart" : "Tambah Sparepart"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="EDC BCA Ingenico"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value }))
                }
                placeholder="EDC-BCA-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stok</Label>
              <Input
                type="number"
                min={0}
                value={form.stock_qty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock_qty: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipe lokasi</Label>
              <Select
                value={form.location_type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    location_type: v as LocationType,
                    warehouse_id:
                      v === "WAREHOUSE" ? f.warehouse_id || defaultWh : "",
                    holder_id: v === "ENGINEER" ? f.holder_id : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="ENGINEER">Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.location_type === "WAREHOUSE" && (
              <div className="space-y-1.5">
                <Label>Gudang</Label>
                {warehouses.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    Belum ada gudang.{" "}
                    <Link
                      href="/admin/warehouses"
                      className="underline font-medium"
                    >
                      Buat gudang dulu
                    </Link>
                    .
                  </p>
                ) : (
                  <Select
                    value={form.warehouse_id || undefined}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, warehouse_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.code} — {w.name}
                          {w.city ? ` (${w.city})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {form.location_type === "ENGINEER" && (
              <div className="space-y-1.5">
                <Label>Holder engineer</Label>
                <Select
                  value={form.holder_id || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, holder_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {engineers.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!historyFor}
        onOpenChange={(v) => {
          if (!v) {
            setHistoryFor(null);
            setMutations([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mutasi · {historyFor?.sku}</DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : mutations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada mutasi.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {mutations.map((m) => (
                <div
                  key={m.id}
                  className="rounded-md border px-2.5 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        m.type === "OUT"
                          ? "destructive"
                          : m.type === "IN"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {m.type} {m.type === "OUT" ? `−${m.qty}` : `+${m.qty}`}
                    </Badge>
                    <span className="font-mono text-muted-foreground">
                      {m.stock_before} → {m.stock_after}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("id-ID")}
                    {m.user ? ` · ${m.user.full_name}` : ""}
                  </p>
                  {m.ticket && (
                    <Link
                      href={`/admin/tickets/${m.ticket.id}`}
                      className="mt-0.5 inline-block font-mono text-sky-700 hover:underline"
                    >
                      {m.ticket.ticket_no}
                    </Link>
                  )}
                  {m.notes && (
                    <p className="mt-0.5 text-muted-foreground">{m.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
