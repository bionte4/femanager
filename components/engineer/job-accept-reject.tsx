"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acceptJobAction,
  rejectJobAction,
  REJECT_REASONS,
} from "@/app/actions/job-response";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function JobAcceptReject({
  ticketId,
  acceptedAt,
  allowReject = true,
}: {
  ticketId: string;
  acceptedAt: string | null;
  /** false untuk PKWT — hard-block reject */
  allowReject?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [notes, setNotes] = useState("");

  if (acceptedAt) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        {allowReject
          ? "Job sudah diterima — lanjut status berikutnya."
          : "Tugas sudah diterima — lanjut status berikutnya."}
      </p>
    );
  }

  function accept() {
    startTransition(async () => {
      const res = await acceptJobAction(ticketId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(allowReject ? "Job diterima" : "Tugas diterima");
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      const res = await rejectJobAction({
        ticket_id: ticketId,
        reason,
        notes: notes || undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Job ditolak — bebas menolak tanpa suspend");
      setRejectOpen(false);
      router.push("/engineer/my-tickets");
      router.refresh();
    });
  }

  if (!allowReject) {
    return (
      <div className="space-y-3">
        <Button
          size="lg"
          className="h-16 w-full text-base font-bold"
          disabled={pending}
          onClick={accept}
        >
          TERIMA TUGAS
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Akun PKWT tidak dapat menolak tugas penempatan. Jika berhalangan,
          hubungi supervisor/NOC.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-16 text-base font-bold"
          disabled={pending}
          onClick={accept}
        >
          TERIMA JOB
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-16 text-base font-bold text-destructive"
          disabled={pending}
          onClick={() => setRejectOpen(true)}
        >
          TOLAK JOB
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Menolak job tidak membuat akun di-suspend. Ini bukti kemitraan bebas.
      </p>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alasan menolak</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Alasan</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Catatan (opsional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={pending}
              onClick={reject}
            >
              Konfirmasi Tolak
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
