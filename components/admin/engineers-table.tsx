"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { EngineerStatus } from "@prisma/client";
import { deleteEngineer } from "@/app/actions/engineers";
import { EngineerForm } from "@/components/admin/engineer-form";
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

type EngineerRow = {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  skills: string[];
  status: EngineerStatus;
  rating: number;
  engagement_type?: string;
  employment_status?: string;
  partnership_status?: string;
};

function engagementBadge(type?: string) {
  if (type === "PKWT_OUTTASK") return { label: "PKWT Outtask", variant: "secondary" as const };
  if (type === "PKWT_INTERNAL") return { label: "PKWT Internal", variant: "secondary" as const };
  return { label: "Mitra", variant: "outline" as const };
}

function statusVariant(status: EngineerStatus) {
  if (status === "AVAILABLE") return "success" as const;
  if (status === "BUSY") return "warning" as const;
  return "secondary" as const;
}

export function EngineersTable({ items }: { items: EngineerRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EngineerRow | null>(null);

  function handleSuccess() {
    setOpen(false);
    setEditing(null);
    toast.success(editing ? "Engineer diupdate" : "Engineer ditambahkan");
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus engineer "${name}"?`)) return;
    const result = await deleteEngineer(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Engineer dihapus");
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
          Tambah Engineer
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden sm:table-cell">HP</TableHead>
              <TableHead className="hidden md:table-cell">Lokasi</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Rating</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    title="Belum ada engineer"
                    description="Tambah field engineer untuk mulai auto-dispatch."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((e) => {
                const eng = engagementBadge(e.engagement_type);
                return (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link
                      href={`/admin/engineers/${e.id}`}
                      className="font-medium text-sky-700 hover:underline"
                    >
                      {e.full_name}
                    </Link>
                    <div className="text-xs text-muted-foreground sm:hidden">{e.phone}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs">
                    {e.phone}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.city ?? "-"}
                    {e.district ? `, ${e.district}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={eng.variant}>{eng.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {e.skills.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {e.rating.toFixed(1)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/engineers/${e.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(e);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(e.id, e.full_name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Engineer" : "Tambah Engineer"}
            </DialogTitle>
          </DialogHeader>
          <EngineerForm
            key={editing?.id ?? "new"}
            initial={
              editing
                ? {
                    id: editing.id,
                    full_name: editing.full_name,
                    phone: editing.phone,
                    city: editing.city,
                    district: editing.district,
                    lat: editing.lat ?? -6.2088,
                    lng: editing.lng ?? 106.8456,
                    skills: editing.skills,
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
