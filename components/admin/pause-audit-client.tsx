"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Pause } from "lucide-react";
import type { PauseAuditRow } from "@/lib/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Props = {
  rows: PauseAuditRow[];
  filters: { from: string; to: string; min_minutes: string };
};

export function PauseAuditClient({ rows, filters }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [minMinutes, setMinMinutes] = useState(filters.min_minutes || "60");

  const summary = useMemo(() => {
    const leakage = rows.filter((r) => r.leakage_flag).length;
    const active = rows.filter((r) => r.currently_paused).length;
    return { total: rows.length, leakage, active };
  }, [rows]);

  function apply() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (minMinutes) p.set("min_minutes", minMinutes);
    router.push(`/admin/reports/pause-audit?${p.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pause Leakage Audit</h1>
        <p className="text-xs text-muted-foreground">
          Ticket dengan stop-clock tinggi — flag jika pause tanpa jejak sparepart.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
          <CardDescription>
            Default threshold pause ≥ 60 menit (atau sedang pause).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40" />
          </div>
          <div className="space-y-1">
            <Label>Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-40" />
          </div>
          <div className="space-y-1">
            <Label>Min pause (mnt)</Label>
            <Input
              type="number"
              min={15}
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value)}
              className="h-8 w-28"
            />
          </div>
          <Button className="h-8" onClick={apply}>
            Terapkan
          </Button>
          <Button variant="outline" className="h-8" asChild>
            <Link href="/admin/reports">← Reports</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Chip label="Ticket diaudit" value={String(summary.total)} />
        <Chip
          label="Leakage flag"
          value={String(summary.leakage)}
          tone={summary.leakage > 0 ? "bad" : "ok"}
        />
        <Chip label="Sedang pause" value={String(summary.active)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hasil audit</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada ticket dengan pause di atas threshold.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Pause</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead>Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/admin/tickets/${r.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {r.ticket_no}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{r.status}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{r.tenant}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.city}
                        {r.engineer ? ` · ${r.engineer}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        {r.currently_paused && <Pause className="h-3 w-3" />}
                        {r.pause_label}
                      </span>
                    </TableCell>
                    <TableCell>{r.stop_count}</TableCell>
                    <TableCell>
                      {r.leakage_flag ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Leakage
                        </Badge>
                      ) : r.has_sparepart_status ? (
                        <Badge variant="secondary">Sparepart OK</Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {r.stop_clock_reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        tone === "ok"
          ? "border-emerald-200 bg-emerald-50/50"
          : tone === "bad"
            ? "border-rose-200 bg-rose-50/40"
            : "bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
