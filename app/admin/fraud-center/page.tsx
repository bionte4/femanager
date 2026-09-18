import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getEngineerTrustList,
  getFraudKpis,
  getFraudLogs,
  getPendingReviewTickets,
} from "@/app/actions/fraud";
import { FraudCenterClient } from "@/components/admin/fraud-center-client";

export default async function FraudCenterPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const [kpis, logs, pending, trust] = await Promise.all([
    getFraudKpis(),
    getFraudLogs(),
    getPendingReviewTickets(),
    getEngineerTrustList(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Anti-Fraud Center</h1>
        <p className="text-xs text-muted-foreground">
          Deteksi fake GPS, foto duplicate, dan review ticket mencurigakan.
        </p>
      </div>
      <FraudCenterClient
        kpis={kpis}
        logs={logs}
        pending={pending}
        trust={trust}
      />
    </div>
  );
}
