import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { getIntegrationDetail } from "@/app/actions/integrations";
import { IntegrationDetailClient } from "@/components/admin/integration-detail-client";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function IntegrationDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);
  const detail = await getIntegrationDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-3">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/admin/integrations">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          {detail.customer_name}
        </h1>
        <p className="text-xs text-muted-foreground">
          Dibuat {new Date(detail.created_at).toLocaleString("id-ID")}
          {detail.last_used_at
            ? ` · Last used ${new Date(detail.last_used_at).toLocaleString("id-ID")}`
            : ""}
        </p>
      </div>
      <IntegrationDetailClient detail={detail} />
    </div>
  );
}
