"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addCertificationAction,
  toggleCertificationAction,
} from "@/app/actions/sdwan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Cert = {
  id: string;
  skill: string;
  level: string;
  certified_at: Date | string;
  expiry_at: Date | string | null;
  certificate_url: string | null;
  is_active: boolean;
};

const SKILLS = ["SDWAN", "MIKROTIK", "FORTIGATE", "CISCO", "EDC"];
const LEVELS = ["BASIC", "INTERMEDIATE", "EXPERT"];

export function CertificationsClient({
  engineerId,
  engineerName,
  certs,
}: {
  engineerId: string;
  engineerName: string;
  certs: Cert[];
}) {
  const router = useRouter();
  const [skill, setSkill] = useState("SDWAN");
  const [level, setLevel] = useState("BASIC");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const res = await addCertificationAction({
      engineer_id: engineerId,
      skill,
      level,
      certificate_url: url || undefined,
    });
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Sertifikasi ditambahkan");
      router.refresh();
    }
  }

  async function toggle(id: string, active: boolean) {
    const res = await toggleCertificationAction(id, active);
    if (!res.success) toast.error(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Sertifikasi — {engineerName}
        </h1>
        <p className="text-muted-foreground">
          Tanpa sertifikasi SDWAN BASIC, engineer tidak masuk auto-dispatch SDWAN.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Sertifikasi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Skill</Label>
            <Select value={skill} onValueChange={setSkill}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>URL sertifikat (opsional)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/uploads/..."
            />
          </div>
          <Button className="sm:col-span-2" disabled={busy} onClick={() => void add()}>
            Add Certification
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Certified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.skill}</TableCell>
                <TableCell>{c.level}</TableCell>
                <TableCell className="text-sm">
                  {new Date(c.certified_at).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "success" : "outline"}>
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void toggle(c.id, !c.is_active)}
                  >
                    {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {certs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Belum ada sertifikasi
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
