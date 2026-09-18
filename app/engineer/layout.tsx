import { redirect } from "next/navigation";
import { PartnershipStatus, Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EngineerBottomNav } from "@/components/engineer/bottom-nav";
import { PwaRegister } from "@/components/engineer/pwa-register";
import { PushRegister } from "@/components/engineer/push-register";

export default async function EngineerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== Role.FIELD_ENGINEER) {
    redirect("/admin/dashboard");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { partnership_status: true },
  });

  const showNav = me?.partnership_status === PartnershipStatus.SIGNED;

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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {(session.user.name ?? "E")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        </div>
      </header>

      <main className={`px-4 pt-3 ${showNav ? "pb-20" : "pb-6"}`}>
        {children}
      </main>

      {showNav && <EngineerBottomNav />}
    </div>
  );
}
