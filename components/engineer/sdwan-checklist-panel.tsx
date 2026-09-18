"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getChecklistItems,
  type ChecklistAnswers,
  type ChecklistKey,
  isChecklistComplete,
} from "@/lib/checklists";
import { saveSdwanChecklistAction } from "@/app/actions/sdwan";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SdwanChecklistPanel({
  ticketId,
  checklistKey,
  initialAnswers,
  editable,
}: {
  ticketId: string;
  checklistKey: ChecklistKey;
  initialAnswers?: ChecklistAnswers | null;
  editable: boolean;
}) {
  const items = getChecklistItems(checklistKey);
  const [answers, setAnswers] = useState<ChecklistAnswers>(initialAnswers ?? {});
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (initialAnswers) setAnswers(initialAnswers);
  }, [initialAnswers]);

  function patch(id: string, partial: ChecklistAnswers[string]) {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...partial },
    }));
  }

  async function uploadPhoto(itemId: string, file: File) {
    setUploading(itemId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("ticketId", ticketId);
      fd.append("label", `checklist-${itemId}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload gagal");
      patch(itemId, { photo_url: json.url, checked: true });
      toast.success("Foto terupload");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(null);
    }
  }

  function save() {
    startTransition(async () => {
      const res = await saveSdwanChecklistAction({
        ticket_id: ticketId,
        checklist_key: checklistKey,
        checklist: answers,
      });
      if (!res.success) toast.error(res.error);
      else toast.success("Checklist disimpan");
    });
  }

  const status = isChecklistComplete(checklistKey, answers);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Checklist {checklistKey.replaceAll("_", " ")}</h3>
          <p className="text-xs text-muted-foreground">
            {status.ok
              ? "Lengkap — boleh resolve"
              : `Belum lengkap (${status.missing.length} item)`}
          </p>
        </div>
        {editable && (
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        )}
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const ans = answers[item.id] ?? {};
          return (
            <li key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                {item.field === "checkbox" && (
                  <Checkbox
                    checked={!!ans.checked}
                    disabled={!editable}
                    onCheckedChange={(c) => patch(item.id, { checked: !!c })}
                  />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className="text-sm leading-snug">{item.label}</Label>
                  {(item.field === "text" || item.field === "number") && (
                    <Input
                      type={item.field === "number" ? "number" : "text"}
                      placeholder={item.placeholder}
                      value={ans.value ?? ""}
                      disabled={!editable}
                      onChange={(e) =>
                        patch(item.id, { value: e.target.value, checked: true })
                      }
                    />
                  )}
                  {item.field === "photo" && (
                    <div className="space-y-2">
                      {editable && (
                        <Input
                          type="file"
                          accept="image/jpeg,image/png"
                          disabled={uploading === item.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadPhoto(item.id, f);
                          }}
                        />
                      )}
                      {ans.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ans.photo_url}
                          alt={item.label}
                          className="h-24 rounded object-cover"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
