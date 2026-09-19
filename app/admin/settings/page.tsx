import Link from "next/link";
import { getSlaConfigs } from "@/app/actions/sla";
import { SlaConfigPanel } from "@/components/admin/sla-config-panel";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const configs = await getSlaConfigs();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground">
            Atur response time & resolution time per SLA tier (menit).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/integrations#channels">WA / Email / AI →</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/settings/commissions">Commission Rules →</Link>
          </Button>
        </div>
      </div>

      <SlaConfigPanel items={configs} />
    </div>
  );
}
