"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CandidateStatus } from "@prisma/client";
import { createManualCandidateAction } from "@/app/actions/recruitment";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

type Item = {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  status: CandidateStatus;
  skills: string[];
  created_at: string;
};

export function CoordinatorRecruitsClient({
  items,
  stats,
  coordinatorId,
}: {
  items: Item[];
  stats: { total: number; approved: number; bonus_earned: number };
  coordinatorId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    whatsapp: "",
    address: "",
    province: "",
    city: "",
    district: "",
    education: "SMK_TKJ",
    skills: ["EDC"] as string[],
    has_motorcycle: true,
  });

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?ref=${coordinatorId}`
      : `/join?ref=${coordinatorId}`;

  async function submitManual() {
    setBusy(true);
    const res = await createManualCandidateAction(form);
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Kandidat ditambahkan");
      setShowForm(false);
      router.refresh();
    }
  }

  function copyReferral() {
    void navigator.clipboard.writeText(
      `${window.location.origin}/join?ref=${coordinatorId}`
    );
    toast.success("Link referral disalin");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Total Recruits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Bonus Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatRupiah(stats.bonus_earned)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Tutup Form" : "Tambah Manual"}
        </Button>
        <Button variant="outline" onClick={copyReferral}>
          Copy Link Referral
        </Button>
        <p className="w-full text-xs text-muted-foreground">{referralLink}</p>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Kandidat Offline (SMK)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["full_name", "Nama"],
                ["phone", "HP"],
                ["whatsapp", "WA"],
                ["address", "Alamat"],
                ["province", "Provinsi"],
                ["city", "Kota"],
                ["district", "Kecamatan"],
                ["education", "Pendidikan"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.has_motorcycle}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, has_motorcycle: !!c }))
                }
              />
              Punya motor
            </label>
            <Button
              className="sm:col-span-2"
              disabled={busy}
              onClick={() => void submitManual()}
            >
              Simpan
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Skill</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Daftar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </TableCell>
                <TableCell>{c.city}</TableCell>
                <TableCell>{c.skills.join(", ")}</TableCell>
                <TableCell>
                  <Badge>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {new Date(c.created_at).toLocaleDateString("id-ID")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
