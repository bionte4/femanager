import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyRecruits } from "@/app/actions/recruitment";
import { CoordinatorRecruitsClient } from "@/components/coordinator/recruits-client";

export default async function CoordinatorRecruitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { is_coordinator: true, role: true },
  });

  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
  if (!user?.is_coordinator && !isAdmin) {
    redirect("/engineer/my-tickets");
  }

  const data = await getMyRecruits();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruits Saya</h1>
        <p className="text-muted-foreground">
          Kelola kandidat yang kamu rekrut. Bonus Rp 25.000 per APPROVED.
        </p>
      </div>
      <CoordinatorRecruitsClient
        items={data.items}
        stats={data.stats}
        coordinatorId={session.user.id}
      />
    </div>
  );
}
