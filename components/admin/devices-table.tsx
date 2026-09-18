"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DeviceStatus, DeviceType } from "@prisma/client";
import { deleteDevice } from "@/app/actions/devices";
import { DeviceForm } from "@/components/admin/device-form";
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

type DeviceRow = {
  id: string;
  tenant_id: string;
  type: DeviceType;
  brand: string | null;
  serial_number: string;
  ip_address: string | null;
  status: DeviceStatus;
  tenant: { id: string; name: string; code: string };
};

type TenantOption = { id: string; name: string; code: string };

function statusVariant(status: DeviceStatus) {
  if (status === "UP") return "success" as const;
  if (status === "DOWN") return "destructive" as const;
  return "warning" as const;
}

export function DevicesTable({
  items,
  tenants,
}: {
  items: DeviceRow[];
  tenants: TenantOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceRow | null>(null);

  function handleSuccess() {
    setOpen(false);
    setEditing(null);
    toast.success(editing ? "Device diupdate" : "Device ditambahkan");
    router.refresh();
  }

  async function handleDelete(id: string, serial: string) {
    if (!confirm(`Hapus device ${serial}?`)) return;
    const result = await deleteDevice(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Device dihapus");
    router.refresh();
  }

  return (
    <>
      <div className="mb-2 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Tambah Device
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="hidden sm:table-cell">Tipe</TableHead>
              <TableHead className="hidden md:table-cell">IP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    title="Belum ada device"
                    description="Tambah EDC/router/switch yang terhubung ke tenant."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-mono text-xs">{d.serial_number}</div>
                    <div className="text-xs text-muted-foreground">{d.brand}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{d.tenant.name}</div>
                    <div className="text-xs text-muted-foreground">{d.tenant.code}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{d.type}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs">
                    {d.ip_address ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(d);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(d.id, d.serial_number)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Device" : "Tambah Device"}</DialogTitle>
          </DialogHeader>
          <DeviceForm
            key={editing?.id ?? "new"}
            tenants={tenants}
            initial={
              editing
                ? {
                    id: editing.id,
                    tenant_id: editing.tenant_id,
                    type: editing.type,
                    brand: editing.brand,
                    serial_number: editing.serial_number,
                    ip_address: editing.ip_address,
                    status: editing.status,
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
