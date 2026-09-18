"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, RotateCcw, Skull } from "lucide-react";
import {
  markDlqDeadAction,
  processDlqNowAction,
  replayDlqAction,
} from "@/app/actions/war-room";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  id: string;
  event: string;
  status: string;
  attempts: number;
  last_error: string | null;
  last_http_status: number | null;
  next_retry_at: string;
  created_at: string;
  ticket_id: string | null;
  customer_name: string;
  integration_id: string;
};

export function WebhookDlqClient({
  rows,
  statusFilter,
}: {
  rows: Row[];
  statusFilter: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onProcess() {
    setBusy("process");
    const r = await processDlqNowAction();
    setBusy(null);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(
      `Processed ${r.data?.processed} · ok ${r.data?.succeeded} · fail ${r.data?.failed} · dead ${r.data?.dead}`
    );
    router.refresh();
  }

  async function onReplay(id: string) {
    setBusy(id);
    const r = await replayDlqAction(id);
    setBusy(null);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success("Replay dijalankan");
    router.refresh();
  }

  async function onDead(id: string) {
    setBusy(id);
    const r = await markDlqDeadAction(id);
    setBusy(null);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success("Ditandai DEAD");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Webhook DLQ</h1>
          <p className="text-xs text-muted-foreground">
            Outbound gagal → antrian retry. Cron: /api/cron/webhook-dlq
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "PENDING", "RETRYING", "DEAD", "SUCCEEDED"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className="h-7 text-xs"
              asChild
            >
              <Link href={s === "all" ? "/admin/integrations/dlq" : `/admin/integrations/dlq?status=${s}`}>
                {s}
              </Link>
            </Button>
          ))}
          <Button size="sm" className="h-7" disabled={!!busy} onClick={onProcess}>
            <RefreshCw className="h-3.5 w-3.5" />
            Process now
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{rows.length} entries</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">DLQ kosong</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Next retry</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/admin/integrations/${r.integration_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {r.customer_name}
                      </Link>
                      {r.ticket_id && (
                        <p className="text-[10px] text-muted-foreground">
                          <Link href={`/admin/tickets/${r.ticket_id}`} className="hover:underline">
                            ticket
                          </Link>
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.event}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "SUCCEEDED"
                            ? "success"
                            : r.status === "DEAD"
                              ? "destructive"
                              : r.status === "RETRYING"
                                ? "warning"
                                : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.attempts}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {r.last_http_status ? `HTTP ${r.last_http_status} · ` : ""}
                      {r.last_error ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.next_retry_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(r.status === "PENDING" ||
                          r.status === "DEAD" ||
                          r.status === "RETRYING") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            disabled={busy === r.id}
                            onClick={() => onReplay(r.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        {r.status !== "DEAD" && r.status !== "SUCCEEDED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            disabled={busy === r.id}
                            onClick={() => onDead(r.id)}
                          >
                            <Skull className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
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
