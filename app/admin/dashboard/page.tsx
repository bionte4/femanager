import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/dashboard";
import { DashboardClient } from "@/components/admin/dashboard-client";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const data = await getDashboardStats();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground">
          KPI SLA, tren ticket, top engineer, dan ticket overdue.
        </p>
      </div>
      <DashboardClient data={data} />
    </div>
  );
}
