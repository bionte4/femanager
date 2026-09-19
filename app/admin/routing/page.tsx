import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES, NOC_L0_ROLES, NOC_L1_ROLES } from "@/lib/auth";
import {
  getL0RoutingQueue,
  getL1RoutingQueue,
  getOverdueRoutingQueue,
  getRoutingCounts,
  getWaitingAcceptQueue,
} from "@/app/actions/routing";
import {
  RoutingQueuesClient,
  type RoutingTabKey,
} from "@/components/admin/routing-queues-client";

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

  const [l0, l1, accept, overdue, counts] = await Promise.all([
    getL0RoutingQueue(),
    getL1RoutingQueue(),
    getWaitingAcceptQueue(),
    getOverdueRoutingQueue(),
    getRoutingCounts(),
  ]);

  const requested = searchParams.tab;
  let tab: RoutingTabKey = "accept";
  if (
    requested === "overdue" ||
    requested === "l0" ||
    requested === "l1" ||
    requested === "accept"
  ) {
    tab = requested;
  } else if (counts.accept > 0) {
    tab = "accept";
  } else if (counts.overdue > 0) {
    tab = "overdue";
  } else if (counts.l0 > 0) {
    tab = "l0";
  } else if (counts.l1 > 0) {
    tab = "l1";
  }

  return (
    <RoutingQueuesClient
      l0={l0}
      l1={l1}
      accept={accept}
      overdue={overdue}
      counts={counts}
      canEscalate={(NOC_L0_ROLES as readonly string[]).includes(session.user.role)}
      canClaimL1={(NOC_L1_ROLES as readonly string[]).includes(session.user.role)}
      canForceRedispatch
      initialTab={tab}
    />
  );
}
