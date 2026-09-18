"use client";

import { useCallback, useEffect, useState } from "react";
import localforage from "localforage";

export type OfflineAction = {
  id: string;
  type: "status_update" | "checkin" | "escalate";
  payload: Record<string, unknown>;
  created_at: string;
  ticket_id: string;
};

const STORE_KEY = "fetrack-offline-queue";

const store = localforage.createInstance({
  name: "fetrack",
  storeName: "offline_queue",
});

async function readQueue(): Promise<OfflineAction[]> {
  return (await store.getItem<OfflineAction[]>(STORE_KEY)) ?? [];
}

async function writeQueue(items: OfflineAction[]) {
  await store.setItem(STORE_KEY, items);
}

async function syncOne(action: OfflineAction): Promise<boolean> {
  try {
    if (action.type === "checkin") {
      const res = await fetch("/api/tickets/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });
      return res.ok;
    }

    if (action.type === "status_update" || action.type === "escalate") {
      const { updateTicketStatusAction } = await import("@/app/actions/tickets");
      const result = await updateTicketStatusAction(
        action.payload as Parameters<typeof updateTicketStatusAction>[0]
      );
      return result.success;
    }

    return false;
  } catch {
    return false;
  }
}

export function useOfflineSync() {
  const [pending, setPending] = useState<OfflineAction[]>([]);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await readQueue());
  }, []);

  const enqueue = useCallback(
    async (
      action: Omit<OfflineAction, "id" | "created_at">
    ): Promise<OfflineAction> => {
      const item: OfflineAction = {
        ...action,
        id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
      };
      const queue = await readQueue();
      queue.push(item);
      await writeQueue(queue);
      await refresh();
      return item;
    },
    [refresh]
  );

  const syncAll = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const queue = await readQueue();
      const remaining: OfflineAction[] = [];
      for (const action of queue) {
        const ok = await syncOne(action);
        if (!ok) remaining.push(action);
      }
      await writeQueue(remaining);
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh, syncing]);

  useEffect(() => {
    void refresh();

    function onOnline() {
      setOnline(true);
      void syncAll();
    }
    function onOffline() {
      setOnline(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh, syncAll]);

  return {
    online,
    pending,
    pendingCount: pending.length,
    syncing,
    enqueue,
    syncAll,
    refresh,
  };
}

/** Ambil posisi GPS browser */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS tidak tersedia di perangkat ini"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}
