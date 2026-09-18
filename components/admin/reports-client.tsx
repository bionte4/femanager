"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileText, Filter, Timer } from "lucide-react";
import { toast } from "sonner";
import type { ReportRow } from "@/lib/reports";
import type { PhaseAverages } from "@/lib/sla-phases";
import { formatPhase } from "@/lib/sla-phases";
import { fetchCustomerSlaReportAction } from "@/app/actions/reports";
import { downloadCustomerSlaPdf } from "@/lib/reports/customer-sla-pdf";
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
  tenants: { id: string; name: string; code: string; city: string }[];
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
    tenant_id: string;
  };
  phaseSummary: PhaseAverages;
};

export function ReportsClient({ rows, options, filters, phaseSummary }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [pdfLoading, setPdfLoading] = useState(false);

  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [city, setCity] = useState(filters.city || "all");
  const [engineerId, setEngineerId] = useState(filters.engineer_id || "all");
  const [slaTier, setSlaTier] = useState(filters.sla_tier || "all");
  const [tenantId, setTenantId] = useState(filters.tenant_id || "all");

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
    setOrDel("tenant_id", tenantId);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({
      ticket_no: r.ticket_no,
      tenant: r.tenant,
      tenant_code: r.tenant_code,
      city: r.city,
      sla_tier: r.sla_tier,
      engineer: r.engineer,
      open_at: formatDt(r.open_at),
      resolved_at: r.resolved_at ? formatDt(r.resolved_at) : "",
      durasi: r.duration,
      response: r.phase_response,
      travel: r.phase_travel,
      onsite: r.phase_onsite,
      repair: r.phase_repair,
      pause: r.phase_pause,
      sla_status: r.sla_status,
      status: r.status,
      priority: r.priority,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SLA Report");
    XLSX.writeFile(
      wb,
      `fetrack-sla-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  async function exportPdf() {
    setPdfLoading(true);
    try {
      const report = await fetchCustomerSlaReportAction({
        from: from || undefined,
        to: to || undefined,
        city: city !== "all" ? city : undefined,
        engineer_id: engineerId !== "all" ? engineerId : undefined,
        sla_tier: slaTier !== "all" ? slaTier : undefined,
        tenant_id: tenantId !== "all" ? tenantId : undefined,
      });
      await downloadCustomerSlaPdf(report);
      toast.success("PDF customer SLA diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal generate PDF");
    } finally {
      setPdfLoading(false);
    }
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
            Filter lalu export Excel / PDF untuk PIC customer. Audit pause di menu terpisah.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <Label>Tenant</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tenant</SelectItem>
                  {options.tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.code} · {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button variant="outline" onClick={exportPdf} disabled={pdfLoading}>
              <FileText className="mr-2 h-4 w-4" />
              {pdfLoading ? "PDF…" : "PDF Customer"}
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/admin/reports/pause-audit">
                <Timer className="mr-2 h-4 w-4" />
                Pause Audit
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryChip label="Total baris" value={String(summary.total)} />
        <SummaryChip label="SLA Meet %" value={`${summary.meetPct}%`} tone="ok" />
        <SummaryChip label="Breach" value={String(summary.breach)} tone="bad" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryChip label="Avg Response" value={formatPhase(phaseSummary.response_avg_ms)} />
        <SummaryChip label="Avg Travel" value={formatPhase(phaseSummary.travel_avg_ms)} />
        <SummaryChip label="Avg On-site" value={formatPhase(phaseSummary.onsite_avg_ms)} />
        <SummaryChip label="Avg Repair" value={formatPhase(phaseSummary.repair_avg_ms)} />
        <SummaryChip label="Avg Pause" value={formatPhase(phaseSummary.pause_avg_ms)} />
        <SummaryChip label="Avg Active" value={formatPhase(phaseSummary.active_avg_ms)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hasil laporan</CardTitle>
          <CardDescription>
            Fase: response · travel · on-site · repair · pause
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada data untuk filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Resp</TableHead>
                    <TableHead>Travel</TableHead>
                    <TableHead>Onsite</TableHead>
                    <TableHead>Repair</TableHead>
                    <TableHead>Pause</TableHead>
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
                        <p className="max-w-[140px] truncate">{r.tenant}</p>
                        <p className="text-xs text-muted-foreground">{r.city}</p>
                      </TableCell>
                      <TableCell className="text-xs">{r.engineer}</TableCell>
                      <TableCell className="text-xs">{r.duration}</TableCell>
                      <TableCell className="font-mono text-[11px]">{r.phase_response}</TableCell>
                      <TableCell className="font-mono text-[11px]">{r.phase_travel}</TableCell>
                      <TableCell className="font-mono text-[11px]">{r.phase_onsite}</TableCell>
                      <TableCell className="font-mono text-[11px]">{r.phase_repair}</TableCell>
                      <TableCell className="font-mono text-[11px]">{r.phase_pause}</TableCell>
                      <TableCell>
                        <SlaBadge status={r.sla_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
