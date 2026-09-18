"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSdwanChecklistAction } from "@/app/actions/sdwan";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Answer = { checked?: boolean; photo_url?: string; value?: string };

/** Checklist dinamis dari ServiceCategory / ServicePackage template */
export function CategoryChecklistPanel({
  ticketId,
  categoryCode,
  items,
  initialAnswers,
  editable,
  requirePhotoKeywords,
}: {
  ticketId: string;
  categoryCode: string;
  items: string[];
  initialAnswers?: Record<string, Answer> | null;
  editable: boolean;
  /** Item yang wajib foto (substring match), ex: ["speedtest", "rekaman"] */
  requirePhotoKeywords?: string[];
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(
    initialAnswers ?? {}
  );
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (initialAnswers) setAnswers(initialAnswers);
  }, [initialAnswers]);

  function itemId(label: string, idx: number) {
    return `cat-${idx}-${label.slice(0, 24).replace(/\s+/g, "_")}`;
  }

  function needsPhoto(label: string) {
    const lower = label.toLowerCase();
    return (requirePhotoKeywords ?? []).some((k) =>
      lower.includes(k.toLowerCase())
    );
  }

  async function uploadPhoto(id: string, file: File, label: string) {
    setUploading(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("ticketId", ticketId);
      fd.append("label", `checklist-${id}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload gagal");

      // Validasi anti-fraud sederhana untuk WIFI speedtest
      if (
        categoryCode === "WIFI" &&
        label.toLowerCase().includes("speedtest") &&
        file.name &&
        !/mbps|speed|ookla|fast/i.test(file.name)
      ) {
        toast.message(
          "Pastikan foto speedtest jelas menampilkan angka Mbps"
        );
      }

      setAnswers((prev) => ({
        ...prev,
        [id]: { ...prev[id], photo_url: json.url, checked: true },
      }));
      toast.success("Foto terupload");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(null);
    }
  }

  function save() {
    for (let i = 0; i < items.length; i++) {
      const label = items[i];
      const id = itemId(label, i);
      if (needsPhoto(label) && !answers[id]?.photo_url) {
        toast.error(`Wajib foto: ${label}`);
        return;
      }
    }
    startTransition(async () => {
      const res = await saveSdwanChecklistAction({
        ticket_id: ticketId,
        checklist_key: `CATEGORY_${categoryCode}`,
        checklist: answers,
      });
      if (!res.success) toast.error(res.error);
      else toast.success("Checklist disimpan");
    });
  }

  const done = items.every((label, i) => {
    const id = itemId(label, i);
    if (needsPhoto(label)) return !!answers[id]?.photo_url;
    return !!answers[id]?.checked;
  });

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">Checklist {categoryCode}</p>
          <p className="text-sm text-muted-foreground">
            {done ? "Lengkap ✓" : `${items.length} item`}
          </p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((label, i) => {
          const id = itemId(label, i);
          const a = answers[id] ?? {};
          const photoRequired = needsPhoto(label);
          return (
            <li key={id} className="rounded-lg border px-3 py-2">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={!!a.checked || !!a.photo_url}
                  disabled={!editable}
                  onCheckedChange={(c) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [id]: { ...prev[id], checked: !!c },
                    }))
                  }
                />
                <div className="flex-1 space-y-2">
                  <Label className="text-base leading-snug">{label}</Label>
                  {photoRequired && editable && (
                    <InputFile
                      busy={uploading === id}
                      onPick={(f) => uploadPhoto(id, f, label)}
                    />
                  )}
                  {a.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.photo_url}
                      alt={label}
                      className="mt-1 h-20 w-auto rounded border object-cover"
                    />
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      {editable && (
        <Button
          type="button"
          className="h-12 w-full text-base"
          disabled={pending}
          onClick={save}
        >
          Simpan Checklist
        </Button>
      )}
    </div>
  );
}

function InputFile({
  busy,
  onPick,
}: {
  busy: boolean;
  onPick: (f: File) => void;
}) {
  return (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      disabled={busy}
      className="block w-full text-xs"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
      }}
    />
  );
}
