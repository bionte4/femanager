"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { LeaderboardPeriod } from "@/lib/leaderboard";
import { SERVICE_CATEGORY_CODES } from "@/lib/service-categories";

export type LeaderboardRow = {
  rank: number;
  engineer_id: string;
  full_name: string;
  city: string | null;
  trust_score: number;
  is_suspended: boolean;
  total_tickets: number;
  sla_meet_rate: number;
  avg_resolve_minutes: number;
  total_earnings: number;
  fraud_count: number;
  score: number;
  period: string;
  skills?: string[];
};

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "Minggu Ini" },
  { key: "month", label: "Bulan Ini" },
  { key: "all_time", label: "All Time" },
];

function crown(rank: number) {
  if (rank === 1) return "👑 ";
  if (rank === 2) return "🥈 ";
  if (rank === 3) return "🥉 ";
  return "";
}

export function LeaderboardClient({
  initialPeriod,
  initialCategory,
  rows,
}: {
  initialPeriod: LeaderboardPeriod;
  initialCategory?: string | null;
  rows: LeaderboardRow[];
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [category, setCategory] = useState<string>(initialCategory ?? "ALL");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function navigate(p: LeaderboardPeriod, cat: string) {
    const params = new URLSearchParams();
    params.set("period", p);
    if (cat && cat !== "ALL") params.set("category", cat);
    startTransition(() => {
      router.push(`/admin/leaderboard?${params.toString()}`);
    });
  }

  function changePeriod(p: LeaderboardPeriod) {
    setPeriod(p);
    navigate(p, category);
  }

  function changeCategory(cat: string) {
    setCategory(cat);
    navigate(period, cat);
  }

  async function recalculate() {
    setBusy(true);
    try {
      const res = await fetch("/api/leaderboard/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Gagal recalculate");
        return;
      }
      toast.success(`Leaderboard ${json.period} dihitung ulang (${json.count} FE)`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = [
      "rank",
      "full_name",
      "city",
      "total_tickets",
      "sla_meet_rate",
      "avg_resolve_minutes",
      "total_earnings",
      "trust_score",
      "fraud_count",
      "score",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.rank,
          `"${r.full_name}"`,
          `"${r.city ?? ""}"`,
          r.total_tickets,
          r.sla_meet_rate,
          r.avg_resolve_minutes,
          r.total_earnings,
          r.trust_score,
          r.fraud_count,
          r.score,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? "default" : "outline"}
            onClick={() => changePeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
          <Button size="sm" onClick={recalculate} disabled={busy}>
            {busy ? "Recalculating…" : "Recalculate"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Kategori:</span>
        <Button
          size="sm"
          variant={category === "ALL" ? "default" : "outline"}
          onClick={() => changeCategory("ALL")}
        >
          Semua
        </Button>
        {SERVICE_CATEGORY_CODES.map((code) => (
          <Button
            key={code}
            size="sm"
            variant={category === code ? "default" : "outline"}
            onClick={() => changeCategory(code)}
          >
            Top FE {code}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Belum ada ranking"
          description="Klik Recalculate atau resolve ticket dulu"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Engineer</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>SLA Meet %</TableHead>
                <TableHead>Avg Resolve</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Fraud</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.engineer_id}>
                  <TableCell className="font-semibold">
                    {crown(r.rank)}#{r.rank}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.city ?? "—"}</p>
                    {r.is_suspended && (
                      <Badge variant="destructive" className="mt-1">
                        Suspended
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.total_tickets}</TableCell>
                  <TableCell>{r.sla_meet_rate}%</TableCell>
                  <TableCell>{r.avg_resolve_minutes} m</TableCell>
                  <TableCell>{formatRupiah(r.total_earnings)}</TableCell>
                  <TableCell>{r.trust_score}</TableCell>
                  <TableCell>{r.fraud_count}</TableCell>
                  <TableCell className="font-semibold">{r.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
