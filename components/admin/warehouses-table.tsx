"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createWarehouse,
  deleteWarehouse,
  updateWarehouse,
} from "@/app/actions/warehouses";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  is_active: boolean;
  _count: { spareparts: number };
};

const emptyForm = {
  code: "",
  name: "",
  city: "",
  address: "",
  is_active: true,
};

export function WarehousesTable({ items }: { items: WarehouseRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: WarehouseRow) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      city: row.city ?? "",
      address: row.address ?? "",
      is_active: row.is_active,
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      city: form.city || null,
      address: form.address || null,
      is_active: form.is_active,
    };
    const result = editing
      ? await updateWarehouse(editing.id, payload)
      : await createWarehouse(payload);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Gudang diupdate" : "Gudang ditambahkan");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(row: WarehouseRow) {
    if (!confirm(`Hapus gudang "${row.name}" (${row.code})?`)) return;
    const result = await deleteWarehouse(row.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Gudang dihapus");
    router.refresh();
  }

  return (
    <>
      <div className="mb-2 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Gudang
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada gudang"
          description="Buat gudang per kota/area, lalu assign sparepart ke gudang tersebut."
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
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kota</TableHead>
                <TableHead>Stok item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.code}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.city ?? "—"}</TableCell>
                  <TableCell>{w._count.spareparts}</TableCell>
                  <TableCell>
                    <Badge variant={w.is_active ? "secondary" : "outline"}>
                      {w.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(w)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(w)}
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
              {editing ? "Edit Gudang" : "Tambah Gudang"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Kode</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="JKT / BDG / HQ"
                className="font-mono uppercase"
                maxLength={6}
              />
              <p className="text-[11px] text-muted-foreground">
                Format: 2–4 huruf (+opsional digit). Contoh: HQ, JKT, BDG, JKT2
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Gudang Jakarta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kota</Label>
              <Input
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="Jakarta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat (opsional)</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Jl. ..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, is_active: v === true }))
                }
              />
              Aktif
            </label>
            <Button className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
