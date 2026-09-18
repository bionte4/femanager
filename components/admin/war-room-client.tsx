"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  HardHat,
  Maximize2,
  Minimize2,
  RefreshCw,
  ServerCrash,
  Timer,
  GitBranch,
  Webhook,
} from "lucide-react";
import { fetchWarRoomSnapshotAction } from "@/app/actions/war-room";
import type { WarRoomSnapshot } from "@/lib/war-room";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = { initial: WarRoomSnapshot };

export function WarRoomClient({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const snap = await fetchWarRoomSnapshotAction();
      setData(snap);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "f" || e.key === "F") setFullscreen((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { kpi } = data;

  return (
    <div
      className={cn(
        "space-y-3",
        fullscreen &&
          "fixed inset-0 z-[100] overflow-auto bg-zinc-950 p-4 text-zinc-100"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1
            className={cn(
              "text-xl font-semibold tracking-tight",
              fullscreen && "text-2xl text-white"
            )}
          >
            War Room
          </h1>
          <p
            className={cn(
              "text-xs text-muted-foreground",
              fullscreen && "text-zinc-400"
            )}
          >
            Live NOC board · auto-refresh 12s · tekan F fullscreen
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={fullscreen ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            onClick={refresh}
            disabled={pending}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {fullscreen ? "Exit" : "Fullscreen"}
          </Button>
          {!fullscreen && (
            <Button variant="ghost" size="sm" className="h-8" asChild>
              <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <Kpi
          label="Device DOWN"
          value={kpi.down_devices}
          icon={ServerCrash}
          tone="bad"
          fullscreen={fullscreen}
        />
        <Kpi
          label="Overdue"
          value={kpi.overdue}
          icon={Timer}
          tone="bad"
          fullscreen={fullscreen}
        />
        <Kpi
          label="L1 Queue"
          value={kpi.pending_l1}
          icon={GitBranch}
          tone="warn"
          fullscreen={fullscreen}
        />
        <Kpi
          label="Open tickets"
          value={kpi.open_tickets}
          icon={Activity}
          fullscreen={fullscreen}
        />
        <Kpi
          label="FE Available"
          value={kpi.fe_available}
          icon={HardHat}
          tone="ok"
          fullscreen={fullscreen}
        />
        <Kpi
          label="FE Busy"
          value={kpi.fe_busy}
          icon={HardHat}
          fullscreen={fullscreen}
        />
        <Kpi
          label="Webhook DLQ"
          value={kpi.webhook_dlq}
          icon={Webhook}
          tone={kpi.webhook_dlq > 0 ? "warn" : undefined}
          fullscreen={fullscreen}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <Panel
          title="Device DOWN"
          fullscreen={fullscreen}
          empty={data.down_devices.length === 0}
        >
          {data.down_devices.map((d) => (
            <Row key={d.id} fullscreen={fullscreen}>
              <div>
                <p className="font-medium">{d.tenant.name}</p>
                <p className="text-[11px] opacity-70">
                  {d.type} · {d.serial_number}
                </p>
              </div>
              <Badge variant="destructive">DOWN</Badge>
            </Row>
          ))}
        </Panel>

        <Panel
          title="SLA Overdue"
          fullscreen={fullscreen}
          empty={data.overdue.length === 0}
        >
          {data.overdue.map((t) => (
            <Row key={t.id} fullscreen={fullscreen} href={`/admin/tickets/${t.id}`}>
              <div>
                <p className="font-mono text-sm font-medium">{t.ticket_no}</p>
                <p className="text-[11px] opacity-70">
                  {t.tenant.name} · {t.engineer ?? "unassigned"}
                </p>
              </div>
              <Badge variant="destructive">{t.status}</Badge>
            </Row>
          ))}
        </Panel>

        <Panel
          title="L1 Queue"
          fullscreen={fullscreen}
          empty={data.l1_queue.length === 0}
        >
          {data.l1_queue.map((t) => (
            <Row key={t.id} fullscreen={fullscreen} href={`/admin/tickets/${t.id}`}>
              <div>
                <p className="font-mono text-sm font-medium">{t.ticket_no}</p>
                <p className="line-clamp-1 text-[11px] opacity-70">{t.description}</p>
              </div>
              <Badge variant="warning">{t.priority}</Badge>
            </Row>
          ))}
        </Panel>

        <Panel
          title="FE Available"
          fullscreen={fullscreen}
          empty={data.engineers_available.length === 0}
        >
          {data.engineers_available.map((e) => (
            <Row key={e.id} fullscreen={fullscreen}>
              <div>
                <p className="font-medium">{e.full_name}</p>
                <p className="text-[11px] opacity-70">
                  {e.city ?? "—"} · {e.skills.join(", ") || "no skill"}
                </p>
              </div>
              <Badge variant="success">AVAIL</Badge>
            </Row>
          ))}
        </Panel>
      </div>

      <p
        className={cn(
          "text-[10px] text-muted-foreground",
          fullscreen && "text-zinc-500"
        )}
      >
        Updated {new Date(data.generated_at).toLocaleTimeString("id-ID")}
        {kpi.webhook_dlq > 0 && (
          <>
            {" · "}
            <Link
              href="/admin/integrations/dlq"
              className="underline"
              onClick={() => setFullscreen(false)}
            >
              Buka Webhook DLQ
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  fullscreen,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  tone?: "ok" | "bad" | "warn";
  fullscreen: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        fullscreen ? "border-zinc-800 bg-zinc-900" : "bg-card",
        tone === "bad" && (fullscreen ? "border-rose-800 bg-rose-950/40" : "border-rose-200 bg-rose-50/50"),
        tone === "warn" && (fullscreen ? "border-amber-800 bg-amber-950/30" : "border-amber-200 bg-amber-50/50"),
        tone === "ok" && (fullscreen ? "border-emerald-800 bg-emerald-950/30" : "border-emerald-200 bg-emerald-50/50")
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] opacity-70">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  empty,
  fullscreen,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  fullscreen: boolean;
}) {
  return (
    <div
      className={cn(
        "flex max-h-[420px] flex-col overflow-hidden rounded-lg border",
        fullscreen ? "border-zinc-800 bg-zinc-900" : "bg-card"
      )}
    >
      <div
        className={cn(
          "border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide",
          fullscreen ? "border-zinc-800 text-zinc-300" : "text-muted-foreground"
        )}
      >
        {title}
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
        {empty ? (
          <p className="px-2 py-6 text-center text-xs opacity-50">Kosong</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Row({
  children,
  href,
  fullscreen,
}: {
  children: React.ReactNode;
  href?: string;
  fullscreen: boolean;
}) {
  const className = cn(
    "flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
    fullscreen ? "hover:bg-zinc-800" : "hover:bg-muted/60"
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}
