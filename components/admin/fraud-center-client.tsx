"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approvePendingReviewAction,
  rejectPendingReviewAction,
  resolveFraudLogAction,
  resetTrustScoreAction,
  setEngineerSuspendAction,
} from "@/app/actions/fraud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Kpis = {
  flags_today: number;
  suspended: number;
  photo_duplicate_today: number;
  avg_trust_score: number;
};

type FraudLogRow = {
  id: string;
  type: string;
  severity: string;
  description: string;
  metadata: Record<string, unknown> | null;
  is_resolved: boolean;
  created_at: string;
  engineer_id: string;
  engineer_name: string;
  ticket_id: string;
  ticket_no: string;
  ticket_status: string;
};

type PendingTicket = {
  id: string;
  ticket_no: string;
  description: string;
  tenant_name: string;
  tenant_code: string;
  engineer_id: string | null;
  engineer_name: string;
  trust_score: number;
  system_score: number | null;
  fraud_flags: string[];
  fraud_logs: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    metadata: Record<string, unknown> | null;
  }>;
  photos: string[];
};

type TrustRow = {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  trust_score: number;
  is_suspended: boolean;
  suspended_reason: string | null;
  fraud_high: number;
  fraud_medium: number;
  fraud_low: number;
};

type FraudTab = "logs" | "pending" | "trust";

function severityBadge(sev: string) {
  if (sev === "HIGH") return <Badge variant="destructive">HIGH</Badge>;
  if (sev === "MEDIUM") return <Badge variant="warning">MEDIUM</Badge>;
  return <Badge variant="secondary">LOW</Badge>;
}

function trustBarColor(score: number) {
  if (score > 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function GpsCompare({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta) return <span className="text-muted-foreground">—</span>;
  const claimedLat = meta.claimed_lat as number | undefined;
  const claimedLng = meta.claimed_lng as number | undefined;
  const exifLat = meta.exif_lat as number | undefined;
  const exifLng = meta.exif_lng as number | undefined;
  const dist = meta.distance_meter as number | undefined;

  if (claimedLat == null && exifLat == null) {
    return (
      <span className="text-xs text-muted-foreground">
        {meta.photo_url ? "No EXIF GPS" : "—"}
      </span>
    );
  }

  return (
    <div className="space-y-1 text-xs">
      {claimedLat != null && claimedLng != null && (
        <p>
          Check-in:{" "}
          <a
            className="text-primary underline"
            href={`https://www.google.com/maps?q=${claimedLat},${claimedLng}`}
            target="_blank"
            rel="noreferrer"
          >
            {claimedLat.toFixed(5)}, {claimedLng.toFixed(5)}
          </a>
        </p>
      )}
      {exifLat != null && exifLng != null && (
        <p>
          EXIF:{" "}
          <a
            className="text-primary underline"
            href={`https://www.google.com/maps?q=${exifLat},${exifLng}`}
            target="_blank"
            rel="noreferrer"
          >
            {exifLat.toFixed(5)}, {exifLng.toFixed(5)}
          </a>
        </p>
      )}
      {dist != null && <p className="font-medium text-destructive">Δ {dist}m</p>}
    </div>
  );
}

export function FraudCenterClient({
  kpis,
  logs,
  pending,
  trust,
}: {
  kpis: Kpis;
  logs: FraudLogRow[];
  pending: PendingTicket[];
  trust: TrustRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<FraudTab>("logs");
  const [sevFilter, setSevFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (sevFilter !== "ALL" && l.severity !== sevFilter) return false;
      if (typeFilter !== "ALL" && l.type !== typeFilter) return false;
      return true;
    });
  }, [logs, sevFilter, typeFilter]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onResolveLog(id: string, confirm: boolean) {
    setBusy(id);
    const res = await resolveFraudLogAction(id, confirm);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error ?? "Gagal");
      return;
    }
    toast.success(confirm ? "Fraud dikonfirmasi + suspend" : "Ditandai bukan fraud");
    refresh();
  }

  async function onApprove(ticketId: string) {
    setBusy(ticketId);
    const res = await approvePendingReviewAction(ticketId);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error ?? "Gagal");
      return;
    }
    toast.success("Approved — komisi dibayar");
    refresh();
  }

  async function onReject(ticketId: string) {
    setBusy(ticketId);
    const res = await rejectPendingReviewAction(ticketId);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error ?? "Gagal");
      return;
    }
    toast.success("Rejected — engineer suspended");
    refresh();
  }

  async function onSuspend(id: string, suspend: boolean) {
    setBusy(id);
    const res = await setEngineerSuspendAction(id, suspend);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error ?? "Gagal");
      return;
    }
    toast.success(suspend ? "Suspended" : "Unsuspended");
    refresh();
  }

  async function onResetTrust(id: string) {
    setBusy(`trust-${id}`);
    const res = await resetTrustScoreAction(id);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error ?? "Gagal");
      return;
    }
    toast.success("Trust score di-reset ke 100");
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flag Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{kpis.flags_today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engineer Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-destructive">
              {kpis.suspended}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Photo Duplicate Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{kpis.photo_duplicate_today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Trust Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{kpis.avg_trust_score}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["logs", "Fraud Logs"],
            ["pending", `Pending Review (${pending.length})`],
            ["trust", "Engineer Trust"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "logs" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All severity</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="FAKE_GPS">FAKE_GPS</SelectItem>
                <SelectItem value="PHOTO_DUPLICATE">PHOTO_DUPLICATE</SelectItem>
                <SelectItem value="FAST_CHECKIN">FAST_CHECKIN</SelectItem>
                <SelectItem value="LOCATION_JUMP">LOCATION_JUMP</SelectItem>
                <SelectItem value="PHOTO_GPS_MISMATCH">PHOTO_GPS_MISMATCH</SelectItem>
                <SelectItem value="TIME_ANOMALY">TIME_ANOMALY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState title="Tidak ada fraud log" description="Belum ada deteksi" />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>GPS Compare</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.engineer_name}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${l.ticket_id}`}
                          className="font-mono text-sm text-primary underline"
                        >
                          {l.ticket_no}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{l.type}</Badge>
                      </TableCell>
                      <TableCell>{severityBadge(l.severity)}</TableCell>
                      <TableCell className="max-w-[240px] text-sm">
                        {l.description}
                      </TableCell>
                      <TableCell>
                        <GpsCompare meta={l.metadata} />
                      </TableCell>
                      <TableCell>
                        {l.is_resolved ? (
                          <Badge variant="outline">Resolved</Badge>
                        ) : (
                          <Badge variant="warning">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {!l.is_resolved && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === l.id}
                              onClick={() => onResolveLog(l.id, false)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy === l.id}
                              onClick={() => onResolveLog(l.id, true)}
                            >
                              Confirm Fraud
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState
              title="Tidak ada pending review"
              description="Ticket dengan HIGH fraud akan muncul di sini"
            />
          ) : (
            pending.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="font-mono text-base">
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="text-primary underline"
                      >
                        {t.ticket_no}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.tenant_name} ({t.tenant_code}) · {t.engineer_name} ·
                      trust {t.trust_score}
                      {t.system_score != null && ` · score ${t.system_score}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.fraud_flags.map((f) => (
                        <Badge key={f} variant="destructive">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      disabled={busy === t.id}
                      onClick={() => onApprove(t.id)}
                    >
                      Approve &amp; Bayar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === t.id}
                      onClick={() => onReject(t.id)}
                    >
                      Reject &amp; Suspend
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm">
                    {t.fraud_logs.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center gap-2">
                        {severityBadge(f.severity)}
                        <span className="font-medium">{f.type}</span>
                        <span className="text-muted-foreground">{f.description}</span>
                      </li>
                    ))}
                  </ul>
                  {t.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {t.photos.slice(0, 4).map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="evidence"
                          className="h-20 w-20 rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "trust" && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Engineer</TableHead>
                <TableHead>Trust Score</TableHead>
                <TableHead>HIGH</TableHead>
                <TableHead>MED</TableHead>
                <TableHead>LOW</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trust.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <p className="font-medium">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.phone} · {e.city ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${trustBarColor(e.trust_score)}`}
                          style={{ width: `${Math.min(100, e.trust_score)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{e.trust_score}</span>
                    </div>
                  </TableCell>
                  <TableCell>{e.fraud_high}</TableCell>
                  <TableCell>{e.fraud_medium}</TableCell>
                  <TableCell>{e.fraud_low}</TableCell>
                  <TableCell>
                    {e.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `trust-${e.id}`}
                      onClick={() => onResetTrust(e.id)}
                    >
                      Reset Trust
                    </Button>
                    <Button
                      size="sm"
                      variant={e.is_suspended ? "default" : "destructive"}
                      disabled={busy === e.id}
                      onClick={() => onSuspend(e.id, !e.is_suspended)}
                    >
                      {e.is_suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
