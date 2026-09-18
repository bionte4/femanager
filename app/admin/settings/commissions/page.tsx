import Link from "next/link";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listCommissionRules } from "@/app/actions/commissions";
import { CommissionsTable } from "@/components/admin/commissions-table";
import { Button } from "@/components/ui/button";

export default async function CommissionsSettingsPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const rules = await listCommissionRules();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Commission Rules</h1>
          <p className="text-xs text-muted-foreground">
            Atur fee, bonus ontime, dan denda SLA breach per ticket.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/settings">← Settings SLA</Link>
        </Button>
      </div>
      <CommissionsTable items={rules} />
    </div>
  );
}
