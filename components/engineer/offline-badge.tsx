"use client";

import { WifiOff, CloudUpload } from "lucide-react";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";

export function OfflineBadge() {
  const { online, pendingCount, syncing, syncAll } = useOfflineSync();

  if (online && pendingCount === 0) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (online && pendingCount > 0) void syncAll();
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
        !online
          ? "bg-amber-100 text-amber-900"
          : "bg-sky-100 text-sky-900"
      )}
    >
      {!online ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          Offline
        </>
      ) : (
        <>
          <CloudUpload className={cn("h-3.5 w-3.5", syncing && "animate-pulse")} />
          Menunggu Sync ({pendingCount})
        </>
      )}
    </button>
  );
}
