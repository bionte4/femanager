"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { signPartnershipAgreementAction } from "@/app/actions/legal";
import { PARTNERSHIP_CONSENT_TEXT } from "@/lib/legal/agreement-template";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  contentHtml: string;
  engineerName: string;
  engineerPhone: string;
  toolsOwned: string[];
  version: string;
};

export function AgreementSignForm({
  contentHtml,
  engineerName,
  engineerPhone,
  toolsOwned,
  version,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const sigRef = useRef<SignatureCanvas>(null);
  const [consent, setConsent] = useState(false);
  const [pending, startTransition] = useTransition();

  function clearSig() {
    sigRef.current?.clear();
  }

  function submit() {
    if (!consent) {
      toast.error("Centang persetujuan dulu");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Tanda tangan wajib");
      return;
    }
    const dataUrl = sigRef.current.toDataURL("image/png");
    startTransition(async () => {
      const res = await signPartnershipAgreementAction({
        signature_data: dataUrl,
        consent_checked: true,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await update();
      toast.success("Perjanjian ditandatangani");
      router.replace("/engineer/my-tickets");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div
        className="prose prose-sm max-w-none rounded-xl border bg-card p-4 text-sm"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <div className="rounded-xl border bg-muted/40 p-4 text-sm">
        <p className="font-semibold">Data Mitra</p>
        <p>{engineerName}</p>
        <p className="text-muted-foreground">{engineerPhone}</p>
        <p className="mt-2 text-xs text-muted-foreground">Versi: {version}</p>
        <p className="mt-1 text-xs">
          Alat milik sendiri:{" "}
          {toolsOwned.length ? toolsOwned.join(", ") : "— belum diisi"}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tanda tangan digital</Label>
        <div className="overflow-hidden rounded-xl border bg-white">
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{
              className: "w-full h-40 touch-none",
              width: 500,
              height: 160,
            }}
            backgroundColor="#ffffff"
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clearSig}>
          Hapus tanda tangan
        </Button>
      </div>

      <label className="flex items-start gap-3 rounded-xl border p-4">
        <Checkbox
          checked={consent}
          onCheckedChange={(c) => setConsent(!!c)}
          className="mt-1"
        />
        <span className="text-sm leading-snug">{PARTNERSHIP_CONSENT_TEXT}</span>
      </label>

      <Button
        type="button"
        size="lg"
        className="h-14 w-full text-base"
        disabled={pending}
        onClick={submit}
      >
        Tanda Tangan &amp; Setuju
      </Button>
    </div>
  );
}
