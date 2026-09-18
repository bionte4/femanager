"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration, getSlaLevel } from "@/lib/utils/sla";
import { getEffectiveSlaDueAt } from "@/lib/stop-clock";
import { Pause } from "lucide-react";

type SLACountdownProps = {
  dueAt: string | Date | null | undefined;
  pausedAt?: string | Date | null;
  pausedTotalMs?: number;
  className?: string;
  compact?: boolean;
};

/**
 * SLA Countdown: hijau >2 jam, kuning <2 jam, merah overdue + blink.
 * Jika stop clock aktif, freeze sisa waktu.
 */
export function SLACountdown({
  dueAt,
  pausedAt,
  pausedTotalMs = 0,
  className,
  compact,
}: SLACountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  const isPaused = !!pausedAt;

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isPaused]);

  if (!dueAt) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>—</span>
    );
  }

  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const paused =
    typeof pausedAt === "string"
      ? new Date(pausedAt)
      : pausedAt ?? null;

  const effectiveDue = getEffectiveSlaDueAt(
    {
      sla_due_at: due,
      sla_paused_at: paused,
      sla_paused_total_ms: pausedTotalMs,
    },
    new Date(now)
  );

  if (!effectiveDue) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>—</span>
    );
  }

  const remaining = isPaused
    ? due.getTime() - (paused?.getTime() ?? now)
    : effectiveDue.getTime() - now;
  const level = isPaused ? "ok" : getSlaLevel(effectiveDue);
  const label =
    remaining > 0
      ? formatDuration(remaining)
      : `Overdue ${formatDuration(remaining)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums",
        isPaused && "bg-slate-200 text-slate-800",
        !isPaused && level === "ok" && "bg-emerald-100 text-emerald-800",
        !isPaused && level === "warning" && "bg-amber-100 text-amber-900",
        !isPaused && level === "overdue" && "animate-pulse bg-red-100 text-red-700",
        compact && "px-1.5 py-0.5",
        className
      )}
      title={
        isPaused
          ? `Stop clock sejak ${paused?.toLocaleString("id-ID")}`
          : due.toLocaleString("id-ID")
      }
    >
      {isPaused && <Pause className="h-3 w-3" />}
      {isPaused ? `PAUSE ${label}` : label}
    </span>
  );
}
