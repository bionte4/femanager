"use client";

import { WifiOff, CloudUpload, AlertTriangle } from "lucide-react";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";

export function OfflineBadge() {
  const {
    online,
    pendingCount,
    conflictCount,
    syncing,
    syncAll,
    discardAllConflicts,
  } = useOfflineSync();

  if (online && pendingCount === 0 && conflictCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {conflictCount > 0 && (
        <button
          type="button"
          onClick={() => void discardAllConflicts()}
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-900"
          title="Buang aksi conflict"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Conflict {conflictCount}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          if (online && pendingCount > 0) void syncAll();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
          !online ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900"
        )}
      >
        {!online ? (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            Offline
          </>
        ) : (
          <>
            <CloudUpload
              className={cn("h-3.5 w-3.5", syncing && "animate-pulse")}
            />
            Sync ({pendingCount})
          </>
        )}
      </button>
    </div>
  );
}
