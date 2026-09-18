"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Navigation,
  MapPin,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import type { DeviceType, TicketStatus } from "@prisma/client";
import { updateTicketStatusAction } from "@/app/actions/tickets";
import { updateEngineerLocation } from "@/app/actions/engineer-tickets";
import { getDeviceChecklist } from "@/lib/utils/checklist";
import { getCurrentPosition, useOfflineSync } from "@/hooks/use-offline-sync";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  ticketId: string;
  status: TicketStatus;
  deviceType: DeviceType | null;
  spareparts?: { id: string; name: string; sku: string; stock_qty: number }[];
  /** Harus accept dulu sebelum ON_THE_WAY */
  acceptedAt?: string | null;
};

export function EngineerTicketActions({
  ticketId,
  status,
  deviceType,
  spareparts = [],
  acceptedAt = null,
}: Props) {
  const router = useRouter();
  const { online, enqueue, pendingCount } = useOfflineSync();
  const checklist = useMemo(() => getDeviceChecklist(deviceType), [deviceType]);

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [pingOk, setPingOk] = useState(false);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [photoMeta, setPhotoMeta] = useState<{
    photo_hash?: string | null;
    exif_lat?: number | null;
    exif_lng?: number | null;
    exif_timestamp?: string | null;
  }>({});
  const [escalateReason, setEscalateReason] = useState("");
  const [sparepartId, setSparepartId] = useState("");
  const [sparepartNote, setSparepartNote] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);

  async function runOnlineOrQueue(
    type: "status_update" | "checkin" | "escalate",
    payload: Record<string, unknown>,
    onlineFn: () => Promise<{ success: boolean; error?: string }>
  ) {
    if (!online) {
      await enqueue({ type, payload, ticket_id: ticketId });
      setOk("Disimpan offline — menunggu sync");
      return { success: true, offline: true };
    }
    return onlineFn();
  }

  async function handleOnTheWay() {
    setLoading("on_the_way");
    setError(null);
    setOk(null);
    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const result = await runOnlineOrQueue(
        "status_update",
        {
          ticket_id: ticketId,
          status: "ON_THE_WAY",
          notes: "Engineer berangkat ke lokasi",
          lat,
          lng,
        },
        async () => {
          await updateEngineerLocation(lat, lng);
          return updateTicketStatusAction({
            ticket_id: ticketId,
            status: "ON_THE_WAY",
            notes: "Engineer berangkat ke lokasi",
            lat,
            lng,
          });
        }
      );

      if (!result.success) {
        setError("error" in result ? result.error ?? "Gagal" : "Gagal");
        return;
      }
      setOk("Status: ON THE WAY");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal ambil GPS");
    } finally {
      setLoading(null);
    }
  }

  async function handleCheckin() {
    setLoading("on_site");
    setError(null);
    setOk(null);
    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const payload = { ticket_id: ticketId, lat, lng };

      if (!online) {
        await enqueue({ type: "checkin", payload, ticket_id: ticketId });
        setOk("Check-in disimpan offline — menunggu sync");
        return;
      }

      const res = await fetch("/api/tickets/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Check-in gagal");
        return;
      }
      setOk(`Check-in OK · jarak ${json.data.distance_meters}m`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal ambil GPS");
    } finally {
      setLoading(null);
    }
  }

  async function handleInProgress() {
    const done = checklist.filter((c) => checked[c.id]);
    if (done.length < Math.ceil(checklist.length / 2)) {
      setError("Centang minimal setengah checklist dulu");
      return;
    }
    setLoading("in_progress");
    setError(null);
    setOk(null);
    const notesText = `Checklist: ${done.map((d) => d.label).join("; ")}`;
    const result = await runOnlineOrQueue(
      "status_update",
      { ticket_id: ticketId, status: "IN_PROGRESS", notes: notesText },
      () =>
        updateTicketStatusAction({
          ticket_id: ticketId,
          status: "IN_PROGRESS",
          notes: notesText,
        })
    );
    setLoading(null);
    if (!result.success) {
      setError("error" in result ? result.error ?? "Gagal" : "Gagal");
      return;
    }
    setOk("Mulai pengerjaan (IN PROGRESS)");
    router.refresh();
  }

  async function uploadPhoto(file: File, label: "before" | "after") {
    const form = new FormData();
    form.append("file", file);
    form.append("ticketId", ticketId);
    form.append("label", label);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error ?? "Upload gagal");
    }
    // Simpan hash + EXIF dari foto before untuk anti-fraud di resolve
    if (label === "before") {
      setPhotoMeta({
        photo_hash: json.photo_hash ?? null,
        exif_lat: json.exif?.lat ?? null,
        exif_lng: json.exif?.lng ?? null,
        exif_timestamp: json.exif?.timestamp ?? null,
      });
    }
    return json.url as string;
  }

  async function handleResolved() {
    if (!beforeUrl || !afterUrl) {
      setError("Upload foto Before & After wajib");
      return;
    }
    if (notes.trim().length < 10) {
      setError("Notes perbaikan minimal 10 karakter");
      return;
    }
    if (!pingOk) {
      setError("Centang test ping/LAN berhasil dulu");
      return;
    }

    setLoading("resolved");
    setError(null);
    setOk(null);

    const resolvePayload = {
      ticket_id: ticketId,
      status: "RESOLVED" as const,
      notes: `${notes.trim()} | Ping/LAN: OK`,
      photo_url: [beforeUrl, afterUrl],
      photo_hash: photoMeta.photo_hash ?? undefined,
      exif_lat: photoMeta.exif_lat ?? undefined,
      exif_lng: photoMeta.exif_lng ?? undefined,
      exif_timestamp: photoMeta.exif_timestamp ?? undefined,
    };

    const result = await runOnlineOrQueue(
      "status_update",
      resolvePayload,
      () => updateTicketStatusAction(resolvePayload)
    );

    setLoading(null);
    if (!result.success) {
      setError("error" in result ? result.error ?? "Gagal" : "Gagal");
      return;
    }
    setOk("Ticket RESOLVED");
    router.refresh();
    router.push("/engineer/my-tickets");
  }

  async function handleEscalate() {
    if (escalateReason.trim().length < 5) {
      setError("Alasan escalate minimal 5 karakter");
      return;
    }
    setLoading("escalate");
    setError(null);

    const selected = spareparts.find((s) => s.id === sparepartId);
    const spareLabel = selected
      ? `${selected.name} (${selected.sku})`
      : sparepartNote.trim() || null;
    const notesText = `ESCALATE: ${escalateReason}${
      spareLabel ? ` | Sparepart: ${spareLabel}` : ""
    }`;

    const result = await runOnlineOrQueue(
      "escalate",
      {
        ticket_id: ticketId,
        status: "PENDING_SPAREPART",
        notes: notesText,
        sparepart_id: sparepartId || undefined,
      },
      async () => {
        if (sparepartId) {
          const { consumeSparepart } = await import("@/app/actions/spareparts");
          const consumed = await consumeSparepart(sparepartId, 1);
          if (!consumed.success) {
            return { success: false, error: consumed.error };
          }
        }
        return updateTicketStatusAction({
          ticket_id: ticketId,
          status: "PENDING_SPAREPART",
          notes: notesText,
        });
      }
    );
    setLoading(null);
    if (!result.success) {
      setError("error" in result ? result.error ?? "Gagal" : "Gagal");
      return;
    }
    setOk("Ticket di-escalate (pending sparepart)");
    setShowEscalate(false);
    router.refresh();
  }

  const btnClass = "h-14 w-full text-lg font-bold";

  return (
    <div className="space-y-4">
      {!online && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base font-medium text-amber-900">
          Mode Offline — aksi disimpan dulu
          {pendingCount > 0 ? ` · Menunggu Sync (${pendingCount})` : ""}
        </div>
      )}
      {online && pendingCount > 0 && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-base font-medium text-sky-900">
          Menunggu Sync: {pendingCount} aksi
        </div>
      )}

      {/* Flow buttons — ON THE WAY hanya setelah accept */}
      {(status === "ASSIGNED" || status === "ESCALATED") && acceptedAt && (
        <Button
          size="lg"
          className={cn(btnClass, "bg-sky-600 hover:bg-sky-700")}
          disabled={!!loading}
          onClick={handleOnTheWay}
        >
          {loading === "on_the_way" ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Navigation className="h-6 w-6" />
          )}
          ON THE WAY
        </Button>
      )}

      {status === "ON_THE_WAY" && (
        <Button
          size="lg"
          className={cn(btnClass, "bg-amber-600 hover:bg-amber-700")}
          disabled={!!loading}
          onClick={handleCheckin}
        >
          {loading === "on_site" ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <MapPin className="h-6 w-6" />
          )}
          CHECK-IN ON SITE
        </Button>
      )}

      {status === "ON_SITE" && (
        <div className="space-y-3 rounded-2xl border-2 p-4">
          <p className="text-lg font-bold">Checklist perangkat</p>
          {checklist.map((item) => (
            <label key={item.id} className="flex items-center gap-3 text-base">
              <Checkbox
                checked={!!checked[item.id]}
                onCheckedChange={(v) =>
                  setChecked((s) => ({ ...s, [item.id]: v === true }))
                }
                className="h-6 w-6"
              />
              {item.label}
            </label>
          ))}
          <Button
            size="lg"
            className={cn(btnClass, "bg-violet-600 hover:bg-violet-700")}
            disabled={!!loading}
            onClick={handleInProgress}
          >
            {loading === "in_progress" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Wrench className="h-6 w-6" />
            )}
            MULAI IN PROGRESS
          </Button>
        </div>
      )}

      {status === "IN_PROGRESS" && (
        <div className="space-y-4 rounded-2xl border-2 p-4">
          <p className="text-lg font-bold">Selesaikan ticket</p>

          <div className="space-y-2">
            <Label className="text-base">Foto Before</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png"
              className="h-12 text-base"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setLoading("upload_before");
                  setBeforeUrl(await uploadPhoto(file, "before"));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload gagal");
                } finally {
                  setLoading(null);
                }
              }}
            />
            {beforeUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={beforeUrl} alt="Before" className="h-32 w-full rounded-lg object-cover" />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base">Foto After</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png"
              className="h-12 text-base"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setLoading("upload_after");
                  setAfterUrl(await uploadPhoto(file, "after"));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload gagal");
                } finally {
                  setLoading(null);
                }
              }}
            />
            {afterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={afterUrl} alt="After" className="h-32 w-full rounded-lg object-cover" />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-base">Notes perbaikan</Label>
            <textarea
              className="min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
              placeholder="Apa yang sudah diperbaiki..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-3 text-base font-medium">
            <Checkbox
              checked={pingOk}
              onCheckedChange={(v) => setPingOk(v === true)}
              className="h-6 w-6"
            />
            Test ping / LAN berhasil
          </label>

          <Button
            size="lg"
            className={cn(btnClass, "bg-emerald-600 hover:bg-emerald-700")}
            disabled={!!loading}
            onClick={handleResolved}
          >
            {loading === "resolved" || loading?.startsWith("upload") ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
            RESOLVED
          </Button>
        </div>
      )}

      {/* Escalate — selalu bisa dari status aktif kecuali resolved */}
      {!["RESOLVED", "CLOSED"].includes(status) && (
        <div className="pt-2">
          {!showEscalate ? (
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full border-red-300 text-base text-red-700"
              onClick={() => setShowEscalate(true)}
            >
              <AlertTriangle className="h-5 w-5" />
              ESCALATE / Butuh Sparepart
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border-2 border-red-200 p-4">
              <p className="text-lg font-bold text-red-800">Escalate</p>
              <textarea
                className="min-h-[80px] w-full rounded-xl border px-3 py-3 text-base"
                placeholder="Alasan escalate..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
              />
              {spareparts.length > 0 ? (
                <select
                  className="h-12 w-full rounded-xl border px-3 text-base"
                  value={sparepartId}
                  onChange={(e) => setSparepartId(e.target.value)}
                >
                  <option value="">Pilih sparepart (opsional)</option>
                  {spareparts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.sku} · stok {s.stock_qty}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className="h-12 text-base"
                  placeholder="Sparepart yang dibutuhkan (opsional)"
                  value={sparepartNote}
                  onChange={(e) => setSparepartNote(e.target.value)}
                />
              )}
              <Button
                size="lg"
                variant="destructive"
                className={btnClass}
                disabled={!!loading}
                onClick={handleEscalate}
              >
                {loading === "escalate" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
                Kirim Escalate
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base font-medium text-destructive">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-800">
          {ok}
        </p>
      )}
    </div>
  );
}
