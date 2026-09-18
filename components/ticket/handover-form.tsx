"use client";

import { useState } from "react";
import {
  REMOTE_ACTION_LABELS,
  REMOTE_ACTION_OPTIONS,
  type RemoteAction,
} from "@/lib/validations/handover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export type HandoverFormValue = {
  symptoms: string;
  last_ping: string;
  remote_actions: RemoteAction[];
  notes: string;
};

const EMPTY: HandoverFormValue = {
  symptoms: "",
  last_ping: "",
  remote_actions: [],
  notes: "",
};

export function HandoverEscalateDialog({
  open,
  onOpenChange,
  ticketNo,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketNo?: string;
  loading?: boolean;
  onSubmit: (value: HandoverFormValue) => void | Promise<void>;
}) {
  const [form, setForm] = useState<HandoverFormValue>(EMPTY);

  function toggleAction(action: RemoteAction, checked: boolean) {
    setForm((f) => ({
      ...f,
      remote_actions: checked
        ? Array.from(new Set([...f.remote_actions, action]))
        : f.remote_actions.filter((a) => a !== action),
    }));
  }

  function handleOpenChange(v: boolean) {
    if (!v) setForm(EMPTY);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Handover L0 → L1
            {ticketNo ? ` · ${ticketNo}` : ""}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Wajib diisi sebelum escalate: gejala, last ping, dan aksi remote yang
          sudah dicoba.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Gejala / gejala lapangan</Label>
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Contoh: EDC offline sejak 13:40, lampu merah, kasir tidak bisa settle"
              value={form.symptoms}
              onChange={(e) =>
                setForm((f) => ({ ...f, symptoms: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Last ping / status monitor</Label>
            <input
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="DOWN sejak 13:42 · packet loss 100%"
              value={form.last_ping}
              onChange={(e) =>
                setForm((f) => ({ ...f, last_ping: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Aksi remote yang sudah dicoba</Label>
            <div className="space-y-2 rounded-md border p-2.5">
              {REMOTE_ACTION_OPTIONS.map((a) => (
                <label
                  key={a}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={form.remote_actions.includes(a)}
                    onCheckedChange={(c) => toggleAction(a, !!c)}
                  />
                  {REMOTE_ACTION_LABELS[a]}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catatan tambahan (opsional)</Label>
            <textarea
              className="flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Kontak PIC, akses parkir, dll."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <Button
            className="w-full"
            disabled={loading}
            onClick={() => onSubmit(form)}
          >
            {loading ? "Mengirim…" : "Escalate ke L1"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HandoverCard({
  handover,
}: {
  handover: {
    symptoms?: string;
    last_ping?: string;
    remote_actions?: string[];
    notes?: string | null;
    handed_over_at?: string;
  } | null;
}) {
  if (!handover?.symptoms) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        Handover L0 → L1
      </p>
      <dl className="mt-2 space-y-1.5">
        <div>
          <dt className="text-[10px] text-muted-foreground">Gejala</dt>
          <dd>{handover.symptoms}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">Last ping</dt>
          <dd>{handover.last_ping}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">Remote actions</dt>
          <dd className="text-xs">
            {(handover.remote_actions ?? [])
              .map((a) => REMOTE_ACTION_LABELS[a as RemoteAction] ?? a)
              .join(" · ") || "—"}
          </dd>
        </div>
        {handover.notes && (
          <div>
            <dt className="text-[10px] text-muted-foreground">Notes</dt>
            <dd>{handover.notes}</dd>
          </div>
        )}
        {handover.handed_over_at && (
          <p className="pt-1 text-[10px] text-muted-foreground">
            {new Date(handover.handed_over_at).toLocaleString("id-ID")}
          </p>
        )}
      </dl>
    </div>
  );
}
