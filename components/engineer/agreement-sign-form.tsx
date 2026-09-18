"use client";

import { useEffect, useRef, useState, type ComponentType, type Ref, type CanvasHTMLAttributes } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { signPartnershipAgreementAction } from "@/app/actions/legal";
import { PARTNERSHIP_CONSENT_TEXT } from "@/lib/legal/agreement-template";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EngineerLogoutButton } from "@/components/engineer/logout-button";

type Props = {
  contentHtml: string;
  engineerName: string;
  engineerPhone: string;
  toolsOwned: string[];
  version: string;
};

type SigPad = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string;
};

type SigProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref?: Ref<any>;
  canvasProps?: CanvasHTMLAttributes<HTMLCanvasElement>;
  backgroundColor?: string;
};

/**
 * Form perjanjian — SignatureCanvas di-load setelah mount (hindari blank SSR).
 */
export function AgreementSignForm({
  contentHtml,
  engineerName,
  engineerPhone,
  toolsOwned,
  version,
}: Props) {
  const { update } = useSession();
  const sigRef = useRef<SigPad | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [SigComponent, setSigComponent] = useState<ComponentType<SigProps> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    void import("react-signature-canvas").then((mod) => {
      if (!cancelled) {
        setSigComponent(() => mod.default as unknown as ComponentType<SigProps>);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function clearSig() {
    sigRef.current?.clear();
  }

  async function submit() {
    if (!consent) {
      toast.error("Centang persetujuan dulu");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Tanda tangan wajib");
      return;
    }
    const dataUrl = sigRef.current.toDataURL("image/png");
    setPending(true);
    try {
      const res = await signPartnershipAgreementAction({
        signature_data: dataUrl,
        consent_checked: true,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      try {
        await update();
      } catch {
        // JWT sync opsional — hard nav tetap jalan
      }
      toast.success("Perjanjian ditandatangani");
      window.location.replace("/engineer/my-tickets");
    } catch {
      toast.error("Gagal menyimpan perjanjian");
    } finally {
      setPending(false);
    }
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
          {SigComponent ? (
            <SigComponent
              ref={sigRef}
              canvasProps={{
                className: "h-40 w-full touch-none",
                width: 500,
                height: 160,
              }}
              backgroundColor="#ffffff"
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              Memuat pad tanda tangan…
            </div>
          )}
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

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base"
          disabled={pending || !SigComponent}
          onClick={() => void submit()}
        >
          {pending ? "Menyimpan…" : "Tanda Tangan & Setuju"}
        </Button>
        <EngineerLogoutButton
          label="Keluar / ganti akun"
          variant="outline"
          className="h-11 w-full"
        />
        <p className="text-center text-[11px] text-muted-foreground">
          Perjanjian wajib sebelum ambil job. Belum siap tanda tangan? Keluar
          dulu, login lagi nanti.
        </p>
      </div>
    </div>
  );
}
