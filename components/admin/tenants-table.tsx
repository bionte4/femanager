"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SlaTier } from "@prisma/client";
import { deleteTenant } from "@/app/actions/tenants";
import { TenantForm } from "@/components/admin/tenant-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type TenantRow = {
  id: string;
  name: string;
  code: string;
  address: string;
  province: string;
  city: string;
  district: string;
  sub_district: string | null;
  lat: number;
  lng: number;
  pic_name: string | null;
  pic_phone: string | null;
  sla_tier: SlaTier;
  is_active: boolean;
  _count: { devices: number };
};

const TIER_LABEL: Record<SlaTier, string> = {
  TIER1_JABODETABEK: "Tier 1",
  TIER2_PROVINCE: "Tier 2",
  TIER3_KABUPATEN: "Tier 3",
};

type TenantsTableProps = {
  items: TenantRow[];
  hideAdd?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  createNonce?: number;
};

export function TenantsTable({
  items,
  hideAdd,
  open: openProp,
  onOpenChange,
  createNonce = 0,
}: TenantsTableProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [editing, setEditing] = useState<TenantRow | null>(null);

  useEffect(() => {
    if (createNonce > 0) setEditing(null);
  }, [createNonce]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setEditing(null);
  }

  function handleSuccess() {
    handleOpenChange(false);
    toast.success(editing ? "Tenant diupdate" : "Tenant ditambahkan");
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus tenant "${name}"? Device terkait ikut terhapus.`)) return;
    const result = await deleteTenant(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Tenant dihapus");
    router.refresh();
  }

  return (
    <>
      {!hideAdd && (
        <div className="mb-2 flex justify-end">
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Tenant
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden md:table-cell">Kota</TableHead>
              <TableHead className="hidden lg:table-cell">SLA</TableHead>
              <TableHead className="hidden sm:table-cell">Devices</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title="Belum ada tenant"
                    description="Tambah toko/tenant untuk mulai monitoring SLA."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-[11px]">{t.code}</TableCell>
                  <TableCell>
                    <div className="font-medium leading-tight">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground md:hidden">
                      {t.city}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{t.city}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {TIER_LABEL[t.sla_tier]}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums">
                    {t._count.devices}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? "success" : "secondary"}>
                      {t.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(t);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(t.id, t.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Tenant" : "Tambah Tenant"}
            </DialogTitle>
          </DialogHeader>
          <TenantForm
            key={editing?.id ?? `new-${createNonce}`}
            initial={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    code: editing.code,
                    address: editing.address,
                    province: editing.province,
                    city: editing.city,
                    district: editing.district,
                    sub_district: editing.sub_district,
                    lat: editing.lat,
                    lng: editing.lng,
                    pic_name: editing.pic_name,
                    pic_phone: editing.pic_phone,
                    sla_tier: editing.sla_tier,
                    is_active: editing.is_active,
                  }
                : undefined
            }
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
