import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listIntegrations } from "@/app/actions/integrations";
import { IntegrationsTable } from "@/components/admin/integrations-table";

export default async function AdminIntegrationsPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const items = await listIntegrations();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-xs text-muted-foreground">
          Open API & webhook untuk customer ITSM (GLPI / ServiceNow).
        </p>
      </div>
      <IntegrationsTable items={items} />
    </div>
  );
}
