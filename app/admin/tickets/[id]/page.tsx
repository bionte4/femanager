import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES, NOC_L0_ROLES } from "@/lib/auth";
import {
  getAssignableEngineers,
  getTicketById,
} from "@/app/actions/tickets";
import { SLACountdown } from "@/components/sla-countdown/sla-countdown";
import { PriorityBadge, TicketStatusBadge } from "@/components/ticket/status-badge";
import { TicketTimeline } from "@/components/ticket/ticket-timeline";
import { PhotoGallery } from "@/components/ticket/photo-gallery";
import { collectLogPhotos } from "@/lib/tickets/photos";
import { TicketActionsPanel } from "@/components/ticket/ticket-actions-panel";
import { TicketAntiFraudSection } from "@/components/ticket/ticket-antifraud-section";
import { HandoverCard } from "@/components/ticket/handover-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeSlaPhases, formatPhase } from "@/lib/sla-phases";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);
  const [ticket, engineers] = await Promise.all([
    getTicketById(id),
    getAssignableEngineers(),
  ]);

  if (!ticket) notFound();

  const photos = collectLogPhotos(ticket.logs);
  const phases = computeSlaPhases({
    created_at: ticket.created_at,
    response_at: ticket.response_at,
    accepted_at: ticket.accepted_at,
    resolved_at: ticket.resolved_at,
    sla_paused_at: ticket.sla_paused_at,
    sla_paused_total_ms: ticket.sla_paused_total_ms,
    logs: ticket.logs,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link href="/admin/tickets">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight">
              {ticket.ticket_no}
            </h1>
            <TicketStatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.sla_paused_at && (
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                Stop clock
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{ticket.description}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs text-muted-foreground">SLA Countdown</p>
          <SLACountdown
            dueAt={ticket.sla_due_at}
            pausedAt={ticket.sla_paused_at}
            pausedTotalMs={ticket.sla_paused_total_ms}
          />
          {ticket.sla_paused_total_ms > 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              Total pause: {Math.round(ticket.sla_paused_total_ms / 60_000)} mnt
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Tenant & Device</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Tenant</p>
                <p className="font-medium">{ticket.tenant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {ticket.tenant.code} · {ticket.tenant.city}
                </p>
                <p className="mt-1 text-sm">{ticket.tenant.address}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Device</p>
                {ticket.device ? (
                  <>
                    <p className="font-medium">{ticket.device.type}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {ticket.device.serial_number}
                    </p>
                    <p className="text-sm">Status: {ticket.device.status}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada device</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Engineer</p>
                <p className="font-medium">
                  {ticket.assigned_engineer?.full_name ?? "Belum di-assign"}
                </p>
                {ticket.assigned_engineer && (
                  <p className="text-sm text-muted-foreground">
                    {ticket.assigned_engineer.phone}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Dispatch attempt: {ticket.dispatch_attempts}
                  {ticket.accepted_at
                    ? " · Accepted"
                    : ticket.last_assigned_at
                      ? " · Menunggu accept"
                      : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="text-sm">Tipe: {ticket.type}</p>
                <p className="text-sm">
                  Dibuat: {new Date(ticket.created_at).toLocaleString("id-ID")}
                </p>
                <p className="text-sm">
                  Reported by: {ticket.reported_by ?? "—"}
                </p>
                {ticket.escalated_to_l1_at && (
                  <p className="text-sm text-amber-700">
                    Escalated L1:{" "}
                    {new Date(ticket.escalated_to_l1_at).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SLA by Phase</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Response", phases.response_ms],
                ["Travel", phases.travel_ms],
                ["On-site", phases.onsite_ms],
                ["Repair", phases.repair_ms],
                ["Pause", phases.pause_ms > 0 ? phases.pause_ms : null],
                ["Active", phases.active_ms],
              ].map(([label, ms]) => (
                <div key={String(label)} className="rounded-md border px-2.5 py-2">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-mono text-sm font-semibold">
                    {formatPhase(ms as number | null)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dokumentasi Before / After</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery photos={photos} title="" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline TicketLog</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketTimeline logs={ticket.logs} />
            </CardContent>
          </Card>

          <TicketAntiFraudSection
            rating={ticket.rating}
            fraudLogs={ticket.fraud_logs}
            logs={ticket.logs}
          />
        </div>

        <div className="space-y-3">
          <HandoverCard
            handover={
              ticket.l1_handover &&
              typeof ticket.l1_handover === "object" &&
              !Array.isArray(ticket.l1_handover)
                ? (ticket.l1_handover as {
                    symptoms?: string;
                    last_ping?: string;
                    remote_actions?: string[];
                    notes?: string | null;
                    handed_over_at?: string;
                  })
                : null
            }
          />
          <TicketActionsPanel
            ticketId={ticket.id}
            ticketNo={ticket.ticket_no}
            currentStatus={ticket.status}
            assignedEngineerId={ticket.assigned_engineer_id}
            engineers={engineers}
            slaPausedAt={ticket.sla_paused_at}
            stopClockReason={ticket.stop_clock_reason}
            canEscalateL0={(NOC_L0_ROLES as readonly string[]).includes(
              session.user.role
            )}
          />
        </div>
      </div>
    </div>
  );
}
