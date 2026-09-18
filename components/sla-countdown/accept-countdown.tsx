"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/sla";
import { Timer } from "lucide-react";

type AcceptCountdownProps = {
  lastAssignedAt: string | Date | null | undefined;
  /** default 15 menit — samakan dengan ACCEPT_TIMEOUT_MS cron */
  timeoutMs?: number;
  className?: string;
  compact?: boolean;
};

/**
 * Countdown sisa waktu FE accept sebelum auto re-assign.
 * Merah + blink saat overdue.
 */
export function AcceptCountdown({
  lastAssignedAt,
  timeoutMs = 15 * 60 * 1000,
  className,
  compact,
}: AcceptCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!lastAssignedAt) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>—</span>
    );
  }

  const start =
    typeof lastAssignedAt === "string"
      ? new Date(lastAssignedAt)
      : lastAssignedAt;
  const deadline = start.getTime() + timeoutMs;
  const remaining = deadline - now;
  const overdue = remaining <= 0;
  const warn = !overdue && remaining <= 5 * 60 * 1000;

  const label = overdue
    ? `Timeout ${formatDuration(remaining)}`
    : formatDuration(remaining);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums",
        !overdue && !warn && "bg-sky-100 text-sky-900",
        warn && "bg-amber-100 text-amber-900",
        overdue && "animate-pulse bg-red-100 text-red-700",
        compact && "px-1.5 py-0.5",
        className
      )}
      title={`Accept deadline ${new Date(deadline).toLocaleString("id-ID")}`}
    >
      <Timer className="h-3 w-3" />
      {label}
    </span>
  );
}
