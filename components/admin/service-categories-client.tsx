"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  Laptop,
  Monitor,
  Pencil,
  Plus,
  Printer,
  Router,
  Trash2,
  Video,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import {
  deleteServicePackageAction,
  upsertServiceCategoryAction,
  upsertServicePackageAction,
} from "@/app/actions/service-categories";
import { CATEGORY_COLORS } from "@/lib/service-categories";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  Laptop,
  Monitor,
  Printer,
  Router,
  Video,
  Wifi,
};

export type CategoryListItem = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  base_fee_tier1: number;
  base_fee_tier2: number;
  base_fee_tier3: number;
  estimated_duration_minutes: number;
  requires_certification: boolean;
  checklist_template: unknown;
  is_active: boolean;
  _count: { packages: number; tickets: number; devices: number };
};

function checklistToText(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join("\n");
  return "";
}

function textToChecklist(s: string): string[] {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function ServiceCategoriesClient({
  items,
}: {
  items: CategoryListItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryListItem | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    code: "",
    name: "",
    icon: "Monitor",
    base_fee_tier1: 100000,
    base_fee_tier2: 125000,
    base_fee_tier3: 175000,
    estimated_duration_minutes: 60,
    requires_certification: false,
    checklist: "",
    is_active: true,
  });

  function openCreate() {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      icon: "Monitor",
      base_fee_tier1: 100000,
      base_fee_tier2: 125000,
      base_fee_tier3: 175000,
      estimated_duration_minutes: 60,
      requires_certification: false,
      checklist: "",
      is_active: true,
    });
    setOpen(true);
  }

  function openEdit(row: CategoryListItem) {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      icon: row.icon ?? "Monitor",
      base_fee_tier1: row.base_fee_tier1,
      base_fee_tier2: row.base_fee_tier2,
      base_fee_tier3: row.base_fee_tier3,
      estimated_duration_minutes: row.estimated_duration_minutes,
      requires_certification: row.requires_certification,
      checklist: checklistToText(row.checklist_template),
      is_active: row.is_active,
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const res = await upsertServiceCategoryAction({
        id: editing?.id,
        code: form.code,
        name: form.name,
        icon: form.icon,
        base_fee_tier1: form.base_fee_tier1,
        base_fee_tier2: form.base_fee_tier2,
        base_fee_tier3: form.base_fee_tier3,
        estimated_duration_minutes: form.estimated_duration_minutes,
        requires_certification: form.requires_certification,
        checklist_template: textToChecklist(form.checklist),
        is_active: form.is_active,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Kategori diupdate" : "Kategori dibuat");
      setOpen(false);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum ada kategori"
        description="Jalankan seed atau buat kategori baru."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead>Fee Tier1/2/3</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Cert</TableHead>
              <TableHead>Paket</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => {
              const Icon = (row.icon && ICON_MAP[row.icon]) || Monitor;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                          CATEGORY_COLORS[row.code] ?? "bg-muted"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {row.code}
                      </span>
                      <div>
                        <p className="font-medium">{row.name}</p>
                        {!row.is_active && (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {formatRupiah(row.base_fee_tier1)}
                    <br />
                    {formatRupiah(row.base_fee_tier2)}
                    <br />
                    {formatRupiah(row.base_fee_tier3)}
                  </TableCell>
                  <TableCell>{row.estimated_duration_minutes} mnt</TableCell>
                  <TableCell>
                    {row.requires_certification ? (
                      <Badge variant="warning">Wajib</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{row._count.packages}</TableCell>
                  <TableCell>{row._count.tickets}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/service-categories/${row.id}`}>
                        Detail
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Kategori" : "Tambah Kategori"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-1">
                <Label>Icon (lucide)</Label>
                <Input
                  value={form.icon}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, icon: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["base_fee_tier1", "Fee Tier1"],
                  ["base_fee_tier2", "Fee Tier2"],
                  ["base_fee_tier3", "Fee Tier3"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Estimasi durasi (menit)</Label>
              <Input
                type="number"
                value={form.estimated_duration_minutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estimated_duration_minutes: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.requires_certification}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, requires_certification: !!c }))
                }
              />
              Wajib sertifikasi
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, is_active: !!c }))
                }
              />
              Aktif
            </label>
            <div className="space-y-1">
              <Label>Checklist template (1 baris = 1 item)</Label>
              <textarea
                className="min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
                value={form.checklist}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checklist: e.target.value }))
                }
              />
            </div>
            <Button className="w-full" disabled={pending} onClick={save}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price_customer: number;
  fee_engineer: number;
  estimated_duration: number;
  required_engineers: number;
  is_active: boolean;
};

export function ServiceCategoryDetailClient({
  categoryId,
  packages,
}: {
  categoryId: string;
  packages: PackageRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_customer: 0,
    fee_engineer: 0,
    estimated_duration: 60,
    required_engineers: 1,
    is_active: true,
  });

  const activeCount = useMemo(
    () => packages.filter((p) => p.is_active).length,
    [packages]
  );

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price_customer: 250000,
      fee_engineer: 100000,
      estimated_duration: 60,
      required_engineers: 1,
      is_active: true,
    });
    setOpen(true);
  }

  function openEdit(row: PackageRow) {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? "",
      price_customer: row.price_customer,
      fee_engineer: row.fee_engineer,
      estimated_duration: row.estimated_duration,
      required_engineers: row.required_engineers,
      is_active: row.is_active,
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const res = await upsertServicePackageAction({
        id: editing?.id,
        service_category_id: categoryId,
        ...form,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Paket disimpan");
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus paket ini?")) return;
    startTransition(async () => {
      const res = await deleteServicePackageAction(id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Paket dihapus");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeCount} paket aktif / {packages.length} total
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Harga Customer</TableHead>
              <TableHead>Fee FE</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>FE #</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  {!p.is_active && (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell>{formatRupiah(p.price_customer)}</TableCell>
                <TableCell>{formatRupiah(p.fee_engineer)}</TableCell>
                <TableCell>{p.estimated_duration} mnt</TableCell>
                <TableCell>{p.required_engineers}</TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(p.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Paket" : "Tambah Paket"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Harga customer</Label>
                <Input
                  type="number"
                  value={form.price_customer}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price_customer: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Fee engineer</Label>
                <Input
                  type="number"
                  value={form.fee_engineer}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fee_engineer: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Durasi (mnt)</Label>
                <Input
                  type="number"
                  value={form.estimated_duration}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estimated_duration: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Jumlah FE</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.required_engineers}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      required_engineers: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, is_active: !!c }))
                }
              />
              Aktif
            </label>
            <Button className="w-full" disabled={pending} onClick={save}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
