"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardStats } from "@/lib/dashboard";
import { formatMttr } from "@/lib/sla";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock3, Ticket, Trophy } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#94a3b8",
  ASSIGNED: "#60a5fa",
  ON_THE_WAY: "#38bdf8",
  ON_SITE: "#a78bfa",
  IN_PROGRESS: "#fbbf24",
  PENDING_SPAREPART: "#fb923c",
  ESCALATED: "#f87171",
  RESOLVED: "#34d399",
  CLOSED: "#10b981",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the way",
  ON_SITE: "On site",
  IN_PROGRESS: "In progress",
  PENDING_SPAREPART: "Sparepart",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

type Props = {
  data: DashboardStats;
};

export function DashboardClient({ data }: Props) {
  const { kpis, tickets_per_day, status_pie, top_engineers, overdue_tickets } = data;
  // Recharts butuh ukuran container di client — render chart setelah mount
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    setChartsReady(true);
  }, []);

  const pieData = status_pie.map((s) => ({
    name: STATUS_LABEL[s.status] ?? s.status,
    value: s.count,
    status: s.status,
  }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="SLA Achievement"
          value={`${kpis.sla_achievement}%`}
          hint="Bulan ini (closed ontime)"
          icon={<Trophy className="h-4 w-4 text-emerald-600" />}
          accent={kpis.sla_achievement >= 95 ? "ok" : kpis.sla_achievement >= 80 ? "warn" : "bad"}
        />
        <KpiCard
          title="MTTR"
          value={formatMttr(kpis.mttr_minutes)}
          hint="Mean time to resolve"
          icon={<Clock3 className="h-4 w-4 text-sky-600" />}
        />
        <KpiCard
          title="Total Ticket"
          value={String(kpis.total_tickets)}
          hint={`${kpis.month_ticket_count} bulan ini`}
          icon={<Ticket className="h-4 w-4 text-indigo-600" />}
        />
        <KpiCard
          title="Ticket Overdue"
          value={String(kpis.overdue_count)}
          hint="Butuh perhatian segera"
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          accent={kpis.overdue_count > 0 ? "bad" : "ok"}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ticket per hari</CardTitle>
            <CardDescription>7 hari terakhir</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tickets_per_day}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Ticket" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Memuat grafik...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status ticket</CardTitle>
            <CardDescription>Distribusi seluruh ticket</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data ticket.</p>
            ) : chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Memuat grafik...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Engineer</CardTitle>
            <CardDescription>Rating & ticket closed tercepat</CardDescription>
          </CardHeader>
          <CardContent>
            {top_engineers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada engineer.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Avg resolve</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top_engineers.map((e, idx) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium">{e.full_name}</p>
                            <p className="text-xs text-muted-foreground">{e.city ?? "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{e.rating.toFixed(1)}</TableCell>
                      <TableCell>{e.closed_count}</TableCell>
                      <TableCell>
                        {e.avg_resolve_minutes != null
                          ? formatMttr(e.avg_resolve_minutes)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Ticket Overdue
              {overdue_tickets.length > 0 && (
                <Badge variant="destructive">{overdue_tickets.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Melewati SLA due, belum resolved</CardDescription>
          </CardHeader>
          <CardContent>
            {overdue_tickets.length === 0 ? (
              <p className="text-sm text-emerald-700">Tidak ada ticket overdue. SLA bagus!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue_tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${t.id}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {t.ticket_no}
                        </Link>
                        <p className="text-xs text-muted-foreground">{t.status}</p>
                      </TableCell>
                      <TableCell>
                        <p className="truncate max-w-[140px]">{t.tenant_name}</p>
                        <p className="text-xs text-muted-foreground">{t.tenant_city}</p>
                      </TableCell>
                      <TableCell>{t.engineer_name ?? "—"}</TableCell>
                      <TableCell className="text-rose-600 text-xs whitespace-nowrap">
                        {t.sla_due_at
                          ? new Date(t.sla_due_at).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: "ok" | "warn" | "bad";
}) {
  const accentClass =
    accent === "ok"
      ? "border-emerald-200 bg-emerald-50/50"
      : accent === "warn"
        ? "border-amber-200 bg-amber-50/40"
        : accent === "bad"
          ? "border-rose-200 bg-rose-50/40"
          : "";

  return (
    <Card className={accentClass}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
