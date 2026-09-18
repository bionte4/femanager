import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Pendaftaran Diterima | FE-Track",
};

const WA_GROUP =
  process.env.NEXT_PUBLIC_RECRUITMENT_WA_GROUP ||
  "https://chat.whatsapp.com/invite-fe-track-recruitment";

export default function JoinSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c1a14] px-4 text-center text-white">
      <CheckCircle2 className="mb-4 h-16 w-16 text-emerald-400" />
      <h1 className="text-2xl font-bold">Pendaftaran diterima!</h1>
      <p className="mt-3 max-w-md text-emerald-100/70">
        Kami akan hubungi via WA dalam 1×24 jam. Sementara itu join grup WA
        recruitment untuk info training &amp; jadwal.
      </p>
      <a
        href={WA_GROUP}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex h-12 items-center rounded-xl bg-emerald-500 px-6 font-semibold text-[#0c1a14] hover:bg-emerald-400"
      >
        Join Grup WA Recruitment
      </a>
      <Link href="/join" className="mt-4 text-sm text-emerald-300/70 hover:underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}
