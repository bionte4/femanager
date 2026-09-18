"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketStatus } from "@prisma/client";
import { Loader2, Pause, Play, ArrowUpRight } from "lucide-react";
import {
  assignEngineerAction,
  pauseSlaClockAction,
  resumeSlaClockAction,
  updateTicketStatusAction,
} from "@/app/actions/tickets";
import { escalateToL1Action } from "@/app/actions/routing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EngineerOption = {
  id: string;
  full_name: string;
  phone: string;
  status: string;
  city: string | null;
  skills: string[];
};

const STATUS_FLOW: TicketStatus[] = [
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

export function TicketActionsPanel({
  ticketId,
  currentStatus,
  assignedEngineerId,
  engineers,
  slaPausedAt,
  stopClockReason,
  canEscalateL0,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
  assignedEngineerId: string | null;
  engineers: EngineerOption[];
  slaPausedAt?: Date | string | null;
  stopClockReason?: string | null;
  canEscalateL0?: boolean;
}) {
  const router = useRouter();
  const [engineerId, setEngineerId] = useState(assignedEngineerId ?? "");
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [notes, setNotes] = useState("");
  const [stopReason, setStopReason] = useState("");
  const [loading, setLoading] = useState<
    "assign" | "status" | "pause" | "resume" | "escalate" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const isPaused = !!slaPausedAt;

  async function handleAssign() {
    if (!engineerId) {
      setError("Pilih engineer dulu");
      return;
    }
    setLoading("assign");
    setError(null);
    setOk(null);
    const result = await assignEngineerAction({
      ticket_id: ticketId,
      engineer_id: engineerId,
      notes: notes || null,
    });
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOk("Engineer berhasil di-assign");
    setStatus("ASSIGNED");
    router.refresh();
  }

  async function handleStatus() {
    setLoading("status");
    setError(null);
    setOk(null);
    const result = await updateTicketStatusAction({
      ticket_id: ticketId,
      status,
      notes: notes || null,
    });
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOk("Status berhasil diupdate");
    setNotes("");
    router.refresh();
  }

  async function handlePause() {
    setLoading("pause");
    setError(null);
    setOk(null);
    const result = await pauseSlaClockAction({
      ticket_id: ticketId,
      reason: stopReason || notes,
    });
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOk("Stop clock aktif — SLA dibekukan");
    setStopReason("");
    router.refresh();
  }

  async function handleResume() {
    setLoading("resume");
    setError(null);
    setOk(null);
    const result = await resumeSlaClockAction({
      ticket_id: ticketId,
      notes: notes || null,
    });
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOk("SLA countdown dilanjutkan");
    router.refresh();
  }

  async function handleEscalate() {
    setLoading("escalate");
    setError(null);
    setOk(null);
    const result = await escalateToL1Action({
      ticket_id: ticketId,
      reason: notes || null,
    });
    setLoading(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOk("Ticket di-escalate ke antrian L1");
    setStatus("PENDING_L1");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aksi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">Stop Clock SLA</Label>
            {isPaused && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-600">
                Paused
              </span>
            )}
          </div>
          {isPaused ? (
            <>
              {stopClockReason && (
                <p className="text-xs text-muted-foreground">{stopClockReason}</p>
              )}
              <Button
                variant="secondary"
                onClick={handleResume}
                disabled={loading === "resume"}
                className="w-full"
              >
                {loading === "resume" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Resume Clock
              </Button>
            </>
          ) : (
            <>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Alasan pause (wajib, min 5 karakter) — mis. tunggu sparepart vendor"
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handlePause}
                disabled={loading === "pause"}
                className="w-full"
              >
                {loading === "pause" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
                Stop Clock
              </Button>
            </>
          )}
        </div>

        {canEscalateL0 &&
          currentStatus !== "PENDING_L1" &&
          currentStatus !== "RESOLVED" &&
          currentStatus !== "CLOSED" && (
            <div className="space-y-2 border-t pt-4">
              <Label>Eskalasi L0 → L1</Label>
              <p className="text-xs text-muted-foreground">
                Kirim ke antrian L1 untuk pengecekan device & assign FE.
              </p>
              <Button
                variant="destructive"
                onClick={handleEscalate}
                disabled={loading === "escalate"}
                className="w-full"
              >
                {loading === "escalate" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                Escalate ke L1
              </Button>
            </div>
          )}

        <div className="space-y-2 border-t pt-4">
          <Label>Assign Engineer (manual)</Label>
          <Select value={engineerId || undefined} onValueChange={setEngineerId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih engineer" />
            </SelectTrigger>
            <SelectContent>
              {engineers.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name} · {e.status}
                  {e.city ? ` · ${e.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={loading === "assign"}
            className="w-full"
          >
            {loading === "assign" && <Loader2 className="animate-spin" />}
            Assign Engineer
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Update Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TicketStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <textarea
            className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Notes (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={handleStatus}
            disabled={loading === "status"}
            className="w-full"
          >
            {loading === "status" && <Loader2 className="animate-spin" />}
            Simpan Status + Log
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {ok && <p className="text-sm text-emerald-700">{ok}</p>}
      </CardContent>
    </Card>
  );
}
