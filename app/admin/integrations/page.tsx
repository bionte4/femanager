import { auth, ADMIN_ROLES, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Inbox } from "lucide-react";
import { listIntegrations } from "@/app/actions/integrations";
import { getIntegrationsSettingsAction } from "@/app/actions/settings-integrations";
import { IntegrationsTable } from "@/components/admin/integrations-table";
import { IntegrationsSettingsClient } from "@/components/admin/integrations-settings-client";
import { Button } from "@/components/ui/button";

export default async function AdminIntegrationsPage() {
  const session = await auth();
  if (
    !session?.user ||
    !(ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
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
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-xs text-muted-foreground">
            Channel runtime &amp; Open API customer — ubah tanpa redeploy.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/admin/integrations/docs">
              <BookOpen className="h-3.5 w-3.5" />
              API Docs
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/admin/integrations/dlq">
              <Inbox className="h-3.5 w-3.5" />
              Webhook DLQ
            </Link>
          </Button>
        </div>
      </div>

      {channelSettings ? (
        <section className="space-y-2" id="channels">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Channels</h2>
            <p className="text-[11px] text-muted-foreground">
              WA · Telegram · Email · AI · Workload
            </p>
          </div>
          <IntegrationsSettingsClient initial={channelSettings} />
        </section>
      ) : null}

      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Customer Open API
          </h2>
          <p className="text-[11px] text-muted-foreground">
            API key &amp; webhook untuk ITSM customer (GLPI / ServiceNow).
          </p>
        </div>
        <IntegrationsTable items={items} />
      </section>
    </div>
  );
}
