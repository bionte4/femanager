import { Suspense } from "react";
import type { Metadata } from "next";
import { JoinRegisterForm } from "@/components/join/register-form";

export const metadata: Metadata = {
  title: "Daftar FE | FE-Track",
};

export default function JoinRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
        <JoinRegisterForm />
      </Suspense>
    </div>
  );
}
