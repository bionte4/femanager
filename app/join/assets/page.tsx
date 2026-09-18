import type { Metadata } from "next";
import Link from "next/link";
import { BrochureDownload } from "@/components/join/brochure-download";

export const metadata: Metadata = {
  title: "Brosur Rekrutmen | FE-Track",
};

export default function JoinAssetsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <h1 className="text-2xl font-bold">Materi Rekrutmen</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Download brosur PDF untuk dibagikan ke SMK, grup Telegram, atau sosial media.
      </p>
      <div className="mt-6">
        <BrochureDownload />
      </div>
      <Link href="/join" className="mt-6 text-sm text-emerald-700 hover:underline">
        ← Kembali ke landing
      </Link>
    </div>
  );
}
