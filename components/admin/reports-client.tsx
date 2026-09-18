"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Filter } from "lucide-react";
import type { ReportRow } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type FilterOptions = {
  cities: string[];
  engineers: { id: string; full_name: string; city: string | null }[];
  sla_tiers: { value: string; label: string }[];
};

type Props = {
  rows: ReportRow[];
  options: FilterOptions;
  filters: {
    from: string;
    to: string;
    city: string;
    engineer_id: string;
    sla_tier: string;
  };
};

export function ReportsClient({ rows, options, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [city, setCity] = useState(filters.city || "all");
  const [engineerId, setEngineerId] = useState(filters.engineer_id || "all");
  const [slaTier, setSlaTier] = useState(filters.sla_tier || "all");

  const summary = useMemo(() => {
    const meet = rows.filter((r) => r.sla_status === "meet").length;
    const breach = rows.filter((r) => r.sla_status === "breach").length;
    const closed = meet + breach;
    const meetPct = closed === 0 ? 100 : Math.round((meet / closed) * 1000) / 10;
    return { meet, breach, meetPct, total: rows.length };
  }, [rows]);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDel = (key: string, value: string) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    };
    setOrDel("from", from);
    setOrDel("to", to);
    setOrDel("city", city);
    setOrDel("engineer_id", engineerId);
    setOrDel("sla_tier", slaTier);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({
      ticket_no: r.ticket_no,
      tenant: r.tenant,
      city: r.city,
      sla_tier: r.sla_tier,
      engineer: r.engineer,
      open_at: formatDt(r.open_at),
      resolved_at: r.resolved_at ? formatDt(r.resolved_at) : "",
      durasi: r.duration,
      sla_status: r.sla_status,
      status: r.status,
      priority: r.priority,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SLA Report");
    const filename = `fetrack-sla-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filter laporan
          </CardTitle>
          <CardDescription>
            Filter tanggal, kota, engineer, dan SLA tier. Export Excel untuk klien.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="from">Dari tanggal</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Sampai tanggal</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kota</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua kota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kota</SelectItem>
                  {options.cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Engineer</Label>
              <Select value={engineerId} onValueChange={setEngineerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua engineer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua engineer</SelectItem>
                  {options.engineers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SLA Tier</Label>
              <Select value={slaTier} onValueChange={setSlaTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tier</SelectItem>
                  {options.sla_tiers.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={applyFilters} disabled={pending}>
              {pending ? "Memuat..." : "Terapkan filter"}
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={rows.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryChip label="Total baris" value={String(summary.total)} />
        <SummaryChip label="SLA Meet %" value={`${summary.meetPct}%`} tone="ok" />
        <SummaryChip label="Breach" value={String(summary.breach)} tone="bad" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hasil laporan</CardTitle>
          <CardDescription>
            Kolom: ticket_no, tenant, engineer, open_at, resolved_at, durasi, sla_status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada data untuk filter ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/admin/tickets/${r.id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {r.ticket_no}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[160px] truncate">{r.tenant}</p>
                      <p className="text-xs text-muted-foreground">{r.city}</p>
                    </TableCell>
                    <TableCell>{r.engineer}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDt(r.open_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.resolved_at ? formatDt(r.resolved_at) : "—"}
                    </TableCell>
                    <TableCell>{r.duration}</TableCell>
                    <TableCell>
                      <SlaBadge status={r.sla_status} />
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

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SlaBadge({ status }: { status: string }) {
  if (status === "meet") return <Badge variant="success">meet</Badge>;
  if (status === "breach") return <Badge variant="destructive">breach</Badge>;
  return <Badge variant="secondary">open</Badge>;
}

function SummaryChip({
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
