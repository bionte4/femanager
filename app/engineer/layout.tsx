import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  eligibleForWork,
  isMitraEngagement,
  isPkwtEngagement,
} from "@/lib/eligibility";
import { EngineerBottomNav } from "@/components/engineer/bottom-nav";
import { PwaRegister } from "@/components/engineer/pwa-register";
import { PushRegister } from "@/components/engineer/push-register";
import { KbChatWidget } from "@/components/kb/kb-chat-widget";
import { EngineerLogoutButton } from "@/components/engineer/logout-button";

export default async function EngineerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "FIELD_ENGINEER") {
    redirect("/admin/dashboard");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { engagement_type: true },
  });

  const elig = await eligibleForWork(session.user.id);
  const engagement = me?.engagement_type ?? "MITRA";
  const isMitra = isMitraEngagement(engagement);
  const isPkwt = isPkwtEngagement(engagement);
  const canWork = elig.ok;

  const headerList = await headers();
  const pathname =
    headerList.get("x-pathname") ??
    headerList.get("x-invoke-path") ??
    headerList.get("next-url") ??
    "";
  const onAgreement =
    pathname.includes("/engineer/agreement") || pathname.endsWith("/agreement");
  const onEmploymentBlocked =
    pathname.includes("/engineer/employment-blocked") ||
    pathname.endsWith("/employment-blocked");

  // MITRA: wajib agreement (pathname kosong tetap treat sebagai perlu gate)
  if (
    isMitra &&
    !canWork &&
    elig.reason === "PARTNERSHIP_NOT_SIGNED" &&
    !onAgreement
  ) {
    redirect("/engineer/agreement");
  }

  // PKWT: skip agreement; block jika belum eligible
  if (isPkwt && !canWork && !onEmploymentBlocked) {
    redirect("/engineer/employment-blocked");
  }

  if (canWork && onAgreement) {
    redirect("/engineer/my-tickets");
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <PwaRegister />
      <PushRegister />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              FE-Track
            </p>
            <p className="text-base font-semibold leading-tight">
              Halo, {session.user.name?.split(" ")[0] ?? "Engineer"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <EngineerLogoutButton className="h-8 px-2 text-xs text-muted-foreground" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {(session.user.name ?? "E")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className={`px-4 pt-3 ${canWork ? "pb-20" : "pb-6"}`}>
        {children}
      </main>

      {canWork && <EngineerBottomNav />}
      {canWork && <KbChatWidget audience="engineer" />}
    </div>
  );
}
