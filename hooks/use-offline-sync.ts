"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import localforage from "localforage";
import { dataUrlToBlob } from "@/lib/utils/image-compress";

export type OfflineActionType =
  | "status_update"
  | "checkin"
  | "escalate"
  | "photo_upload";

export type OfflineAction = {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  created_at: string;
  ticket_id: string;
  /** Status ticket saat enqueue — untuk conflict detect */
  expected_from_status?: string | null;
  /** Hasil sync terakhir */
  last_error?: string | null;
  conflict?: boolean;
  attempts?: number;
};

export type SyncResult = {
  synced: number;
  failed: number;
  conflicts: number;
};

const QUEUE_KEY = "fetrack-offline-queue-v2";
const BLOB_PREFIX = "blob:";

const queueStore = localforage.createInstance({
  name: "fetrack",
  storeName: "offline_queue_v2",
});

const blobStore = localforage.createInstance({
  name: "fetrack",
  storeName: "offline_blobs",
});

async function readQueue(): Promise<OfflineAction[]> {
  return (await queueStore.getItem<OfflineAction[]>(QUEUE_KEY)) ?? [];
}

async function writeQueue(items: OfflineAction[]) {
  await queueStore.setItem(QUEUE_KEY, items);
}

export async function storeOfflineBlob(
  dataUrl: string,
  meta: { ticket_id: string; label: string }
): Promise<string> {
  const id = `blob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await blobStore.setItem(id, { dataUrl, ...meta, created_at: new Date().toISOString() });
  return id;
}

async function uploadBlobId(
  blobId: string,
  ticketId: string,
  label: string
): Promise<string | null> {
  const row = await blobStore.getItem<{ dataUrl: string }>(blobId);
  if (!row?.dataUrl) return null;

  const blob = dataUrlToBlob(row.dataUrl);
  const form = new FormData();
  form.append("file", blob, `${label}.jpg`);
  form.append("ticketId", ticketId);
  form.append("label", label);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Upload offline gagal");
  }
  await blobStore.removeItem(blobId);
  return json.url as string;
}

/**
 * Resolve photo_blob_ids / photo_data_urls di payload jadi URL server.
 */
async function resolvePhotosInPayload(
  payload: Record<string, unknown>,
  ticketId: string
): Promise<Record<string, unknown>> {
  const next = { ...payload };

  const blobIds = next.photo_blob_ids as string[] | undefined;
  if (blobIds?.length) {
    const urls: string[] = [];
    for (let i = 0; i < blobIds.length; i++) {
      const label = i === 0 ? "before" : i === 1 ? "after" : `photo${i}`;
      const url = await uploadBlobId(blobIds[i], ticketId, label);
      if (url) urls.push(url);
    }
    next.photo_url = urls;
    delete next.photo_blob_ids;
  }

  const dataUrls = next.photo_data_urls as string[] | undefined;
  if (dataUrls?.length) {
    const urls: string[] = [];
    for (let i = 0; i < dataUrls.length; i++) {
      const id = await storeOfflineBlob(dataUrls[i], {
        ticket_id: ticketId,
        label: i === 0 ? "before" : "after",
      });
      const label = i === 0 ? "before" : "after";
      const url = await uploadBlobId(id, ticketId, label);
      if (url) urls.push(url);
    }
    next.photo_url = urls;
    delete next.photo_data_urls;
  }

  return next;
}

async function syncOne(action: OfflineAction): Promise<{
  ok: boolean;
  conflict?: boolean;
  error?: string;
}> {
  try {
    if (action.type === "photo_upload") {
      const blobId = String(action.payload.blob_id ?? "");
      const label = String(action.payload.label ?? "photo");
      await uploadBlobId(blobId, action.ticket_id, label);
      return { ok: true };
    }

    if (action.type === "checkin") {
      const res = await fetch("/api/tickets/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = String(json.error ?? `HTTP ${res.status}`);
        // GPS radius fail = hard fail, keep in queue? Better drop as conflict if already on site
        if (/already|sudah|ON_SITE/i.test(err)) {
          return { ok: false, conflict: true, error: err };
        }
        return { ok: false, error: err };
      }
      return { ok: true };
    }

    if (action.type === "status_update" || action.type === "escalate") {
      const payload = await resolvePhotosInPayload(
        { ...action.payload },
        action.ticket_id
      );

      if (action.expected_from_status) {
        payload.expected_from_status = action.expected_from_status;
      }

      const { updateTicketStatusAction } = await import("@/app/actions/tickets");
      const result = await updateTicketStatusAction(
        payload as Parameters<typeof updateTicketStatusAction>[0]
      );

      if (!result.success) {
        const err = result.error;
        const conflict =
          err.startsWith("CONFLICT:") ||
          /sudah (resolved|closed|melewati)/i.test(err);
        return { ok: false, conflict, error: err };
      }
      return { ok: true };
    }

    return { ok: false, error: "Unknown action type" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sync gagal",
    };
  }
}

export function useOfflineSync() {
  const [pending, setPending] = useState<OfflineAction[]>([]);
  const [conflicts, setConflicts] = useState<OfflineAction[]>([]);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const all = await readQueue();
    setPending(all.filter((a) => !a.conflict));
    setConflicts(all.filter((a) => a.conflict));
  }, []);

  const enqueue = useCallback(
    async (
      action: Omit<OfflineAction, "id" | "created_at">
    ): Promise<OfflineAction> => {
      const item: OfflineAction = {
        ...action,
        id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        attempts: 0,
      };
      const queue = await readQueue();
      queue.push(item);
      await writeQueue(queue);
      await refresh();
      return item;
    },
    [refresh]
  );

  const discardConflict = useCallback(
    async (id: string) => {
      const queue = (await readQueue()).filter((a) => a.id !== id);
      await writeQueue(queue);
      await refresh();
    },
    [refresh]
  );

  const discardAllConflicts = useCallback(async () => {
    const queue = (await readQueue()).filter((a) => !a.conflict);
    await writeQueue(queue);
    await refresh();
  }, [refresh]);

  const syncAll = useCallback(async (): Promise<SyncResult> => {
    if (syncingRef.current) {
      return lastResult ?? { synced: 0, failed: 0, conflicts: 0 };
    }
    syncingRef.current = true;
    setSyncing(true);

    const result: SyncResult = { synced: 0, failed: 0, conflicts: 0 };

    try {
      const queue = await readQueue();
      // FIFO, photo_upload dulu per ticket
      const sorted = [...queue].sort((a, b) => {
        if (a.ticket_id === b.ticket_id) {
          if (a.type === "photo_upload" && b.type !== "photo_upload") return -1;
          if (b.type === "photo_upload" && a.type !== "photo_upload") return 1;
        }
        return a.created_at.localeCompare(b.created_at);
      });

      const remaining: OfflineAction[] = [];

      for (const action of sorted) {
        if (action.conflict) {
          remaining.push(action);
          continue;
        }

        const res = await syncOne(action);
        if (res.ok) {
          result.synced += 1;
          continue;
        }

        const attempts = (action.attempts ?? 0) + 1;
        if (res.conflict) {
          result.conflicts += 1;
          remaining.push({
            ...action,
            conflict: true,
            last_error: res.error ?? "Conflict",
            attempts,
          });
        } else {
          result.failed += 1;
          remaining.push({
            ...action,
            last_error: res.error ?? "Gagal sync",
            attempts,
          });
        }
      }

      await writeQueue(remaining);
      await refresh();
      setLastResult(result);
      return result;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refresh, lastResult]);

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
    conflicts,
    pendingCount: pending.length,
    conflictCount: conflicts.length,
    syncing,
    lastResult,
    enqueue,
    syncAll,
    refresh,
    discardConflict,
    discardAllConflicts,
    storeOfflineBlob,
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

// silence unused
void BLOB_PREFIX;
