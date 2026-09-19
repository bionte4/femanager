import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import { getIntegrationsSettingsAction } from "@/app/actions/settings-integrations";
import { IntegrationsSettingsClient } from "@/components/admin/integrations-settings-client";
import { Button } from "@/components/ui/button";

export default async function IntegrationsSettingsPage() {
  const session = await auth();
  if (
    !session?.user ||
    !(CONTRACT_ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    redirect("/admin/settings");
  }

  const initial = await getIntegrationsSettingsAction();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Integrasi — WA / Email / AI
          </h1>
          <p className="text-xs text-muted-foreground">
            Override runtime (tersimpan di database). Field kosong tetap bisa
            fallback ke .env.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/settings">← Settings</Link>
        </Button>
      </div>
      <IntegrationsSettingsClient initial={initial} />
    </div>
  );
}
