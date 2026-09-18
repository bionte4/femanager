"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { LocationType } from "@prisma/client";
import {
  createSparepart,
  deleteSparepart,
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
  holder_id: string | null;
  holder: { id: string; full_name: string; phone: string } | null;
};

type EngineerOption = { id: string; full_name: string };

export function SparepartsTable({
  items,
  engineers,
}: {
  items: SparepartRow[];
  engineers: EngineerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SparepartRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    stock_qty: "0",
    location_type: "WAREHOUSE" as LocationType,
    holder_id: "",
  });

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      stock_qty: "10",
      location_type: "WAREHOUSE",
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
      holder_id: row.holder_id ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      stock_qty: Number(form.stock_qty),
      location_type: form.location_type,
      holder_id: form.holder_id || null,
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
                <TableHead>Holder</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                  <TableCell>
                    <Badge variant={s.stock_qty <= 2 ? "destructive" : "secondary"}>
                      {s.stock_qty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.location_type}</Badge>
                  </TableCell>
                  <TableCell>{s.holder?.full_name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
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
            <DialogTitle>{editing ? "Edit Sparepart" : "Tambah Sparepart"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="EDC BCA Ingenico"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="EDC-BCA-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stok</Label>
              <Input
                type="number"
                min={0}
                value={form.stock_qty}
                onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lokasi</Label>
              <Select
                value={form.location_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, location_type: v as LocationType }))
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
            {form.location_type === "ENGINEER" && (
              <div className="space-y-1.5">
                <Label>Holder engineer</Label>
                <Select
                  value={form.holder_id || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, holder_id: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
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
    </>
  );
}
