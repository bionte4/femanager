"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CandidateStatus } from "@prisma/client";
import {
  assignCoordinatorAction,
  bulkUpdateStatusAction,
} from "@/app/actions/recruitment";
import { CandidateMap } from "@/components/admin/candidate-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

type Kpis = {
  today: number;
  screening: number;
  training: number;
  trial: number;
  approved_month: number;
  fe_active: number;
};

type CandidateRow = {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  province: string;
  education: string;
  skills: string[];
  status: CandidateStatus;
  screening_score: number | null;
  has_motorcycle: boolean;
  selfie_photo_url: string | null;
  age: number | null;
  created_at: string;
  coordinator: { id: string; full_name: string } | null;
};

type Gap = {
  city: string;
  province: string;
  tenant_count: number;
  fe_count: number;
  needed_count: number;
  ratio: number;
  sdwan_needed?: number;
};

type Coord = { id: string; full_name: string; phone: string; city: string | null };

type MapPoint = {
  id: string;
  full_name: string;
  city: string;
  status: CandidateStatus;
  lat: number | null;
  lng: number | null;
  skills: string[];
};

const STATUSES: CandidateStatus[] = [
  "NEW",
  "SCREENING",
  "TRAINING",
  "TRIAL",
  "APPROVED",
  "REJECTED",
  "BLACKLISTED",
];

function statusBadge(s: CandidateStatus) {
  const map: Record<CandidateStatus, "default" | "secondary" | "warning" | "success" | "destructive" | "outline"> = {
    NEW: "default",
    SCREENING: "secondary",
    TRAINING: "warning",
    TRIAL: "warning",
    APPROVED: "success",
    REJECTED: "destructive",
    BLACKLISTED: "outline",
  };
  return <Badge variant={map[s]}>{s}</Badge>;
}

export function RecruitmentClient({
  kpis,
  candidates,
  gaps,
  coordinators,
  mapPoints,
}: {
  kpis: Kpis;
  candidates: CandidateRow[];
  gaps: Gap[];
  coordinators: Coord[];
  mapPoints: MapPoint[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [province, setProvince] = useState("");
  const [skill, setSkill] = useState("ALL");
  const [motorOnly, setMotorOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCoord, setBulkCoord] = useState("");
  const [bulkStatus, setBulkStatus] = useState<string>("");

  const provinces = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.province))).sort(),
    [candidates]
  );

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (status !== "ALL" && c.status !== status) return false;
      if (province && c.province !== province) return false;
      if (skill !== "ALL" && !c.skills.includes(skill)) return false;
      if (motorOnly && !c.has_motorcycle) return false;
      if (q.trim()) {
        const qq = q.trim().toLowerCase();
        if (
          !c.full_name.toLowerCase().includes(qq) &&
          !c.phone.includes(qq) &&
          !c.city.toLowerCase().includes(qq)
        )
          return false;
      }
      return true;
    });
  }, [candidates, status, province, skill, motorOnly, q]);

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(filtered.map((c) => c.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function doAssign() {
    if (!bulkCoord || selected.size === 0) return;
    const res = await assignCoordinatorAction(Array.from(selected), bulkCoord);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Coordinator assigned");
      setSelected(new Set());
      startTransition(() => router.refresh());
    }
  }

  async function doBulkStatus() {
    if (!bulkStatus || selected.size === 0) return;
    const res = await bulkUpdateStatusAction(
      Array.from(selected),
      bulkStatus as CandidateStatus
    );
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Status updated");
      setSelected(new Set());
      startTransition(() => router.refresh());
    }
  }

  function exportCsv() {
    const header = [
      "full_name",
      "phone",
      "city",
      "province",
      "education",
      "skills",
      "status",
      "screening_score",
      "age",
      "coordinator",
      "created_at",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((c) =>
        [
          `"${c.full_name}"`,
          c.phone,
          `"${c.city}"`,
          `"${c.province}"`,
          c.education,
          `"${c.skills.join("|")}"`,
          c.status,
          c.screening_score ?? "",
          c.age ?? "",
          `"${c.coordinator?.full_name ?? ""}"`,
          c.created_at,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ["Hari Ini", kpis.today],
          ["Menunggu Screening", kpis.screening],
          ["Training", kpis.training],
          ["Trial", kpis.trial],
          ["Approved Bulan Ini", kpis.approved_month],
          ["FE Aktif", kpis.fe_active],
        ].map(([label, val]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{val as number}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {gaps.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">
              Area Butuh FE Mendesak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gaps.slice(0, 12).map((g) => (
                <Badge key={`${g.province}-${g.city}`} variant="warning">
                  {g.city}: butuh +{g.needed_count} FE
                  {g.sdwan_needed ? ` · SDWAN +${g.sdwan_needed}` : ""} (tenant{" "}
                  {g.tenant_count} / FE {g.fe_count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Peta Sebaran Candidate
        </h2>
        <CandidateMap points={mapPoints} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Cari nama / HP / kota"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={province || "ALL"}
          onValueChange={(v) => setProvince(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Provinsi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua provinsi</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={skill} onValueChange={setSkill}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua skill</SelectItem>
            {[
              "EDC",
              "SDWAN",
              "DESKTOP",
              "LAPTOP",
              "WIFI",
              "CCTV",
              "PRINTER",
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={motorOnly}
            onCheckedChange={(c) => setMotorOnly(!!c)}
          />
          Punya motor
        </label>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selected.size} dipilih</span>
          <Select value={bulkCoord} onValueChange={setBulkCoord}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assign koordinator" />
            </SelectTrigger>
            <SelectContent>
              {coordinators.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => void doAssign()}>
            Assign
          </Button>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ubah status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" onClick={() => void doBulkStatus()}>
            Update Status
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filtered.length > 0 && selected.size === filtered.length
                  }
                  onCheckedChange={(c) => toggleAll(!!c)}
                />
              </TableHead>
              <TableHead>Foto</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Skill</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Koordinator</TableHead>
              <TableHead>Daftar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={(ch) => toggleOne(c.id, !!ch)}
                  />
                </TableCell>
                <TableCell>
                  {c.selfie_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.selfie_photo_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {c.full_name[0]}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/recruitment/${c.id}`}
                    className="font-medium text-primary underline"
                  >
                    {c.full_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {c.phone}
                    {c.age != null ? ` · ${c.age} th` : ""}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {c.city}
                  <br />
                  <span className="text-xs text-muted-foreground">{c.province}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.skills.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className={
                          ["SDWAN", "Mikrotik", "Fortigate", "Cisco", "MIKROTIK"].includes(s)
                            ? "border-violet-400 bg-violet-100 text-[10px] text-violet-800"
                            : "text-[10px]"
                        }
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{statusBadge(c.status)}</TableCell>
                <TableCell>{c.screening_score ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {c.coordinator?.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
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
