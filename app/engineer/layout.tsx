import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateEligibility,
  engagementLabel,
  findActiveContract,
  isMitraEngagement,
  isPkwtEngagement,
} from "@/lib/eligibility";
import { EngineerBottomNav } from "@/components/engineer/bottom-nav";
import { PwaRegister } from "@/components/engineer/pwa-register";
import { PushRegister } from "@/components/engineer/push-register";
import { KbChatWidget } from "@/components/kb/kb-chat-widget";
import { EngineerLogoutButton } from "@/components/engineer/logout-button";
import { HardRedirect } from "@/components/engineer/hard-redirect";
import { Badge } from "@/components/ui/badge";

function resolvePathname(headerList: Headers): string {
  // Middleware set x-pathname; fallback lain untuk soft-nav / proxy
  const candidates = [
    headerList.get("x-pathname"),
    headerList.get("x-invoke-path"),
    headerList.get("next-url"),
    headerList.get("x-url"),
    headerList.get("referer"),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      if (raw.startsWith("http")) {
        return new URL(raw).pathname;
      }
      if (raw.startsWith("/")) return raw.split("?")[0] ?? raw;
    } catch {
      /* ignore */
    }
  }
  return "";
}

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

  // Satu query user (hindari double fetch auth + eligibleForWork)
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      is_suspended: true,
      engagement_type: true,
      employment_status: true,
      partnership_status: true,
    },
  });

  if (!me) {
    redirect("/login");
  }

  if (me.is_suspended) {
    await signOut({ redirectTo: "/login" });
  }

  const engagement = me.engagement_type ?? "MITRA";
  const isMitra = isMitraEngagement(engagement);
  const isPkwt = isPkwtEngagement(engagement);

  const contract = isPkwt ? await findActiveContract(session.user.id) : null;
  const elig = evaluateEligibility(me, {
    hasActiveContract: !!contract,
    contractId: contract?.id,
  });
  const canWork = elig.ok;

  const headerList = await headers();
  const pathname = resolvePathname(headerList);
  const pathnameKnown = pathname.length > 0;
  const onAgreement =
    pathname.includes("/engineer/agreement") || pathname.endsWith("/agreement");
  const onEmploymentBlocked =
    pathname.includes("/engineer/employment-blocked") ||
    pathname.endsWith("/employment-blocked");

  /**
   * PENTING: pakai HardRedirect, bukan redirect() RSC.
   * Soft redirect di layout sering nyangkut blank putih di /engineer/agreement
   * (FE baru unsigned → gate partnership).
   */
  if (
    isMitra &&
    !canWork &&
    elig.reason === "PARTNERSHIP_NOT_SIGNED" &&
    pathnameKnown &&
    !onAgreement
  ) {
    return <HardRedirect href="/engineer/agreement" />;
  }

  // Pathname tidak terbaca (edge case): unsigned Mitra → hard nav ke agreement
  // (replace ke URL yang sama = reload penuh, lebih aman daripada soft-loop blank)
  if (
    isMitra &&
    !canWork &&
    elig.reason === "PARTNERSHIP_NOT_SIGNED" &&
    !pathnameKnown
  ) {
    return <HardRedirect href="/engineer/agreement" />;
  }

  if (isPkwt && !canWork && pathnameKnown && !onEmploymentBlocked) {
    return <HardRedirect href="/engineer/employment-blocked" />;
  }

  if (isPkwt && !canWork && !pathnameKnown) {
    return <HardRedirect href="/engineer/employment-blocked" />;
  }

  if (canWork && onAgreement) {
    return <HardRedirect href="/engineer/my-tickets" />;
  }

  const showChromeExtras = canWork;
  const skipPush = onAgreement || onEmploymentBlocked || !canWork;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <PwaRegister />
      {/* Jangan load Firebase/FCM di halaman agreement — bikin delay/blank di FE baru */}
      {!skipPush && <PushRegister />}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              FE-Track
            </p>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold leading-tight">
                Halo, {session.user.name?.split(" ")[0] ?? "Engineer"}
              </p>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                {engagementLabel(engagement)}
              </Badge>
            </div>
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

      <main className={`px-4 pt-3 ${showChromeExtras ? "pb-20" : "pb-6"}`}>
        {children}
      </main>

      {showChromeExtras && <EngineerBottomNav isPkwt={isPkwt} />}
      {showChromeExtras && <KbChatWidget audience="engineer" />}
    </div>
  );
}
