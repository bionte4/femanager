"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { Priority, TicketStatus } from "@prisma/client";
import { CreateTicketForm } from "@/components/ticket/create-ticket-form";
import { PriorityBadge, TicketStatusBadge } from "@/components/ticket/status-badge";
import { SLACountdown } from "@/components/sla-countdown/sla-countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type TicketItem = {
  id: string;
  ticket_no: string;
  priority: Priority;
  status: TicketStatus;
  description: string;
  sla_due_at: string | null;
  sla_paused_at?: string | null;
  sla_paused_total_ms?: number;
  created_at: string;
  tenant: { id: string; name: string; code: string; city: string };
  device: { id: string; type: string; serial_number: string } | null;
  assigned_engineer: { id: string; full_name: string; phone: string } | null;
};

type TicketsResponse = {
  success: boolean;
  data: {
    items: TicketItem[];
    total: number;
    page: number;
    totalPages: number;
  };
};

type TenantOption = { id: string; name: string; code: string };
type DeviceOption = {
  id: string;
  tenant_id: string;
  type: string;
  serial_number: string;
  service_category_id?: string | null;
};
type PackageOption = {
  id: string;
  name: string;
  description: string | null;
  price_customer: number;
  fee_engineer: number;
  estimated_duration: number;
  required_engineers: number;
};
type CategoryOption = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  estimated_duration_minutes: number;
  packages: PackageOption[];
};

const STATUS_OPTIONS: TicketStatus[] = [
  "OPEN",
  "ASSIGNED",
  "ON_THE_WAY",
  "ON_SITE",
  "IN_PROGRESS",
  "PENDING_SPAREPART",
  "ESCALATED",
  "PENDING_L1",
  "PENDING_REVIEW",
  "RESOLVED",
  "CLOSED",
];

async function fetchTickets(params: {
  q: string;
  status: string;
  page: number;
}): Promise<TicketsResponse["data"]> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  sp.set("page", String(params.page));
  sp.set("pageSize", "15");

  const res = await fetch(`/api/tickets?${sp.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Gagal load tickets");
  const json = (await res.json()) as TicketsResponse;
  return json.data;
}

export function TicketsRealtimeTable({
  tenants,
  devices,
  categories,
}: {
  tenants: TenantOption[];
  devices: DeviceOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const query = useQuery({
    queryKey: ["tickets", q, status, page],
    queryFn: () => fetchTickets({ q, status, page }),
    refetchInterval: 15_000, // realtime polling 15 detik
  });

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`/admin/tickets?${params.toString()}`);
  }

  const data = query.data;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("q", qInput);
            }}
            onBlur={() => updateParam("q", qInput)}
            placeholder="Cari ticket_no / tenant..."
            className="sm:max-w-xs"
          />
          <Select value={status} onValueChange={(v) => updateParam("status", v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Buat Ticket
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Auto-refresh setiap 15 detik
        {query.dataUpdatedAt
          ? ` · terakhir ${new Date(query.dataUpdatedAt).toLocaleTimeString("id-ID")}`
          : ""}
      </p>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="hidden md:table-cell">Device</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Engineer</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Memuat tickets...
                </TableCell>
              </TableRow>
            ) : !data || data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Belum ada ticket
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      {t.ticket_no}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.tenant.name}</div>
                    <div className="text-xs text-muted-foreground">{t.tenant.code}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">
                    {t.device ? (
                      <>
                        {t.device.type}
                        <div className="font-mono text-muted-foreground">
                          {t.device.serial_number}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {t.assigned_engineer?.full_name ?? (
                      <span className="text-muted-foreground">Belum assign</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SLACountdown
                      dueAt={t.sla_due_at}
                      pausedAt={t.sla_paused_at}
                      pausedTotalMs={t.sla_paused_total_ms}
                      compact
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/tickets/${t.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {data.page} / {data.totalPages} · {data.total} ticket
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParam("page", String(page - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => updateParam("page", String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Ticket Baru</DialogTitle>
          </DialogHeader>
          <CreateTicketForm
            tenants={tenants}
            devices={devices}
            categories={categories}
            onSuccess={(id) => {
              setCreateOpen(false);
              query.refetch();
              router.push(`/admin/tickets/${id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
