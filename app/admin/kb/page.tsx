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
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-xs text-muted-foreground">
          SOP EDC &amp; SDWAN untuk engineer lapangan.
        </p>
      </div>
      <KbAdminClient items={items} />
    </div>
  );
}
