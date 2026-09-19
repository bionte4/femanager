"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createAdminUser,
  deleteAdminUser,
  updateAdminUser,
} from "@/app/actions/admin-users";
import { APP_ADMIN_ROLE_OPTIONS } from "@/lib/rbac-constants";
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
import { EmptyState } from "@/components/ui/empty-state";

type AdminUserRow = {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  is_suspended: boolean;
  created_at: string | Date;
};

type AuditRow = {
  id: string;
  action: string;
  target_user_id: string | null;
  metadata: unknown;
  created_at: string;
  actor_name: string;
  actor_phone: string;
};

type FormState = {
  full_name: string;
  phone: string;
  role: string;
  password: string;
  is_suspended: boolean;
};

const emptyForm: FormState = {
  full_name: "",
  phone: "",
  role: "DISPATCHER",
  password: "",
  is_suspended: false,
};

export function AdminUsersClient({
  items,
  audits,
  currentUserId,
}: {
  items: AdminUserRow[];
  audits: AuditRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: AdminUserRow) {
    setEditing(row);
    setForm({
      full_name: row.full_name,
      phone: row.phone,
      role: row.role,
      password: "",
      is_suspended: row.is_suspended,
    });
    setOpen(true);
  }

  async function onSubmit() {
    setPending(true);
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      role: form.role as
        | "SUPER_ADMIN"
        | "ADMIN_NOC"
        | "DISPATCHER"
        | "NOC_L0"
        | "NOC_L1",
      password: form.password || undefined,
      is_suspended: form.is_suspended,
    };
    const res = editing
      ? await updateAdminUser(editing.id, payload)
      : await createAdminUser(payload);
    setPending(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "User diupdate" : "User ditambahkan");
    setOpen(false);
    router.refresh();
  }

  async function onDelete(row: AdminUserRow) {
    if (row.id === currentUserId) {
      toast.error("Tidak boleh hapus akun sendiri");
      return;
    }
    if (!confirm(`Hapus user admin "${row.full_name}"?`)) return;
    const res = await deleteAdminUser(row.id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("User dihapus");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah User
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>HP</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    title="Belum ada user admin"
                    description="Tambah SUPER_ADMIN / ADMIN_NOC / Dispatcher / NOC."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (anda)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{u.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {u.role.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.is_suspended ? "destructive" : "success"}
                    >
                      {u.is_suspended ? "Suspended" : "Aktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={u.id === currentUserId}
                        onClick={() => void onDelete(u)}
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

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Audit terbaru</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-xs text-muted-foreground"
                  >
                    Belum ada audit
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.actor_name}
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {a.actor_phone}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {JSON.stringify(a.metadata ?? {})}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit User Admin" : "Tambah User Admin"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor HP</Label>
              <Input
                value={form.phone}
                placeholder="08xxxxxxxxxx"
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APP_ADMIN_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Password{" "}
                {editing && (
                  <span className="font-normal text-muted-foreground">
                    (kosongkan = tidak diubah)
                  </span>
                )}
              </Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                placeholder={editing ? "Password baru (opsional)" : "Min. 8 karakter"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_suspended}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, is_suspended: c === true }))
                }
              />
              Suspended (tidak bisa login)
            </label>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() => void onSubmit()}
            >
              {pending ? "Menyimpan…" : editing ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
