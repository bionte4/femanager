import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES, NOC_L0_ROLES, NOC_L1_ROLES } from "@/lib/auth";
import {
  getL0RoutingQueue,
  getL1RoutingQueue,
  getRoutingCounts,
  getWaitingAcceptQueue,
} from "@/app/actions/routing";
import { RoutingQueuesClient } from "@/components/admin/routing-queues-client";

type SearchParams = { tab?: string };

export default async function AdminRoutingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const [l0, l1, accept, counts] = await Promise.all([
    getL0RoutingQueue(),
    getL1RoutingQueue(),
    getWaitingAcceptQueue(),
    getRoutingCounts(),
  ]);

  const tab =
    searchParams.tab === "l1"
      ? "l1"
      : searchParams.tab === "accept"
        ? "accept"
        : "l0";

  return (
    <RoutingQueuesClient
      l0={l0}
      l1={l1}
      accept={accept}
      counts={counts}
      canEscalate={(NOC_L0_ROLES as readonly string[]).includes(session.user.role)}
      canClaimL1={(NOC_L1_ROLES as readonly string[]).includes(session.user.role)}
      initialTab={tab}
    />
  );
}
