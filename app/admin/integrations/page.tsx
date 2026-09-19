import { auth, ADMIN_ROLES, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listIntegrations } from "@/app/actions/integrations";
import { getIntegrationsSettingsAction } from "@/app/actions/settings-integrations";
import { IntegrationsTable } from "@/components/admin/integrations-table";
import { IntegrationsSettingsClient } from "@/components/admin/integrations-settings-client";

export default async function AdminIntegrationsPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const canManageChannels = (CONTRACT_ADMIN_ROLES as readonly string[]).includes(
    session.user.role
  );

  const [items, channelSettings] = await Promise.all([
    listIntegrations(),
    canManageChannels ? getIntegrationsSettingsAction() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      {channelSettings ? (
        <section className="space-y-3" id="channels">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
            <p className="text-xs text-muted-foreground">
              Channel runtime (WA / Email / AI) — override .env tanpa redeploy.
            </p>
          </div>
          <IntegrationsSettingsClient initial={channelSettings} />
        </section>
      ) : (
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Customer Open API
          </h2>
          <p className="text-xs text-muted-foreground">
            API key & webhook untuk customer ITSM (GLPI / ServiceNow).
          </p>
        </div>
        <IntegrationsTable items={items} />
      </section>
    </div>
  );
}
