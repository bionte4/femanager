import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPauseAuditRows } from "@/lib/reports";
import { PauseAuditClient } from "@/components/admin/pause-audit-client";

type SearchParams = {
  from?: string;
  to?: string;
  min_minutes?: string;
};

export default async function PauseAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const minMinutes = Number(searchParams.min_minutes ?? "60") || 60;
  const rows = await getPauseAuditRows({
    from: searchParams.from,
    to: searchParams.to,
    min_pause_ms: minMinutes * 60_000,
  });

  return (
    <PauseAuditClient
      rows={rows}
      filters={{
        from: searchParams.from ?? "",
        to: searchParams.to ?? "",
        min_minutes: String(minMinutes),
      }}
    />
  );
}
