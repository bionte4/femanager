"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Priority, TicketStatus } from "@prisma/client";
import { ArrowUpRight, RefreshCw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  claimL1TicketAction,
  escalateToL1Action,
} from "@/app/actions/routing";
import { forceRedispatchAction } from "@/app/actions/tickets";
import {
  HandoverEscalateDialog,
  type HandoverFormValue,
} from "@/components/ticket/handover-form";
import { PriorityBadge, TicketStatusBadge } from "@/components/ticket/status-badge";
import { AcceptCountdown } from "@/components/sla-countdown/accept-countdown";
import { SLACountdown } from "@/components/sla-countdown/sla-countdown";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type QueueTicket = {
  id: string;
  ticket_no: string;
  status: TicketStatus;
  priority: Priority;
  description: string;
  sla_due_at: Date | string | null;
  sla_paused_at: Date | string | null;
  sla_paused_total_ms: number;
  escalated_to_l1_at: Date | string | null;
  last_assigned_at?: Date | string | null;
  accepted_at?: Date | string | null;
  created_at: Date | string;
  tenant: { name: string; code: string; city: string | null };
  device: { type: string; serial_number: string } | null;
  assigned_engineer: { full_name: string } | null;
};

export type RoutingTabKey = "accept" | "overdue" | "l0" | "l1";

function isSlaHot(dueAt: Date | string | null): boolean {
  if (!dueAt) return false;
  const due = new Date(dueAt).getTime();
  return due <= Date.now() + 2 * 60 * 60 * 1000;
}

function isSlaOverdue(dueAt: Date | string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() <= Date.now();
}

export function RoutingQueuesClient({
  l0,
  l1,
  accept,
  overdue,
  counts,
  canEscalate,
  canClaimL1,
  canForceRedispatch,
  initialTab,
}: {
  l0: QueueTicket[];
  l1: QueueTicket[];
  accept: QueueTicket[];
  overdue: QueueTicket[];
  counts: { l0: number; l1: number; accept: number; overdue: number };
  canEscalate: boolean;
  canClaimL1: boolean;
  canForceRedispatch: boolean;
  initialTab: RoutingTabKey;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<RoutingTabKey>(initialTab);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handoverTicket, setHandoverTicket] = useState<QueueTicket | null>(null);

  const rows = useMemo(() => {
    if (tab === "accept") return accept;
    if (tab === "overdue") return overdue;
    if (tab === "l1") return l1;
    return l0;
  }, [tab, accept, overdue, l0, l1]);

  async function onEscalate(handover: HandoverFormValue) {
    if (!handoverTicket) return;
    setBusyId(handoverTicket.id);
    const result = await escalateToL1Action({
      ticket_id: handoverTicket.id,
      handover: {
        symptoms: handover.symptoms,
        last_ping: handover.last_ping,
        remote_actions: handover.remote_actions,
        notes: handover.notes || null,
      },
    });
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Escalated ke L1");
    setHandoverTicket(null);
    router.refresh();
  }

  async function onClaim(id: string) {
    setBusyId(id);
    const result = await claimL1TicketAction({ ticket_id: id });
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Claimed — buka detail untuk assign FE");
    router.push(`/admin/tickets/${id}`);
  }

  async function onForceRedispatch(id: string) {
    setBusyId(id);
    const result = await forceRedispatchAction(id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data?.engineer_name
        ? `Re-dispatch → ${result.data.engineer_name}`
        : "Force re-dispatch sukses"
    );
    router.refresh();
  }

  const tabs: { key: RoutingTabKey; label: string; hot?: boolean }[] = [
    {
      key: "accept",
      label: `Waiting Accept (${counts.accept})`,
      hot: counts.accept > 0,
    },
    {
      key: "overdue",
      label: `SLA Hot (${counts.overdue})`,
      hot: counts.overdue > 0,
    },
    { key: "l0", label: `L0 Inbox (${counts.l0})` },
    { key: "l1", label: `L1 Queue (${counts.l1})` },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Routing Queue</h1>
        <p className="text-xs text-muted-foreground">
          Exception dulu: waiting accept &amp; SLA hot — lalu L0/L1. Urutan baris
          = SLA due terdekat.
        </p>
      </div>

      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-md border bg-muted/40 p-0.5">
        {tabs.map(({ key, label, hot }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              tab === key
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              hot && tab !== key && "text-amber-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            tab === "accept"
              ? "Tidak ada job menunggu accept"
              : tab === "overdue"
                ? "Tidak ada SLA hot"
                : tab === "l1"
                  ? "Antrian L1 kosong"
                  : "Inbox L0 kosong"
          }
          description={
            tab === "accept"
              ? "Semua ASSIGNED sudah di-accept, atau belum ada assign."
              : tab === "overdue"
                ? "Tidak ada ticket aktif dengan SLA ≤ 2 jam / overdue."
                : tab === "l1"
                  ? "Tidak ada ticket PENDING_L1."
                  : "Tidak ada ticket OPEN / ESCALATED yang menunggu."
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{tab === "accept" ? "Accept" : "SLA"}</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const overdue = isSlaOverdue(t.sla_due_at);
                const hot = isSlaHot(t.sla_due_at);
                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      overdue && "bg-red-50/80",
                      !overdue && hot && "bg-amber-50/60"
                    )}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {t.ticket_no}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <PriorityBadge priority={t.priority} />
                        {overdue && (
                          <span className="text-[10px] font-semibold uppercase text-red-700">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{t.tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.tenant.code}
                        {t.tenant.city ? ` · ${t.tenant.city}` : ""}
                      </p>
                      {t.device && (
                        <p className="text-xs text-muted-foreground">
                          {t.device.type} · {t.device.serial_number}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={t.status} />
                      {t.assigned_engineer && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.assigned_engineer.full_name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {tab === "accept" ? (
                        <AcceptCountdown
                          lastAssignedAt={t.last_assigned_at}
                          compact
                        />
                      ) : (
                        <SLACountdown
                          dueAt={t.sla_due_at}
                          pausedAt={t.sla_paused_at}
                          pausedTotalMs={t.sla_paused_total_ms}
                          compact
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {tab === "l0" && canEscalate && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            disabled={busyId === t.id}
                            onClick={() => setHandoverTicket(t)}
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            ke L1
                          </Button>
                        )}
                        {tab === "l1" && canClaimL1 && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={busyId === t.id}
                            onClick={() => void onClaim(t.id)}
                          >
                            <UserCheck className="h-3 w-3" />
                            Claim
                          </Button>
                        )}
                        {canForceRedispatch &&
                          ["OPEN", "ASSIGNED", "ESCALATED", "PENDING_SPAREPART"].includes(
                            t.status
                          ) &&
                          !t.accepted_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={busyId === t.id}
                              onClick={() => void onForceRedispatch(t.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Re-dispatch
                            </Button>
                          )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          asChild
                        >
                          <Link href={`/admin/tickets/${t.id}`}>Detail</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <HandoverEscalateDialog
        open={!!handoverTicket}
        onOpenChange={(v) => {
          if (!v) setHandoverTicket(null);
        }}
        ticketNo={handoverTicket?.ticket_no}
        loading={busyId === handoverTicket?.id}
        onSubmit={onEscalate}
      />
    </div>
  );
}
