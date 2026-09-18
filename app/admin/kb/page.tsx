import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { listAllKnowledgeBaseAdmin } from "@/app/actions/sdwan";
import { KbAdminClient } from "@/components/admin/kb-admin-client";

export default async function AdminKbPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const items = await listAllKnowledgeBaseAdmin();

  return (
    <div className="space-y-2.5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-xs leading-snug text-muted-foreground">
          SOP lapangan: EDC, SDWAN, LAN/WAN, WiFi, CCTV, printer &amp; general.
        </p>
      </div>
      <Suspense fallback={<p className="text-xs text-muted-foreground">Memuat KB…</p>}>
        <KbAdminClient items={items} />
      </Suspense>
    </div>
  );
}
