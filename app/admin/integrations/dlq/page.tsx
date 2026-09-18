import { redirect } from "next/navigation";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { listWebhookDeadLetters } from "@/lib/webhook-dlq";
import { WebhookDlqClient } from "@/components/admin/webhook-dlq-client";

type SearchParams = { status?: string };

export default async function WebhookDlqPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const status = searchParams.status ?? "all";
  const rows = await listWebhookDeadLetters({
    status: status !== "all" ? status : undefined,
    limit: 100,
  });

  return (
    <WebhookDlqClient
      statusFilter={status}
      rows={rows.map((r) => ({
        id: r.id,
        event: r.event,
        status: r.status,
        attempts: r.attempts,
        last_error: r.last_error,
        last_http_status: r.last_http_status,
        next_retry_at: r.next_retry_at.toISOString(),
        created_at: r.created_at.toISOString(),
        ticket_id: r.ticket_id,
        customer_name: r.integration.customer_name,
        integration_id: r.integration.id,
      }))}
    />
  );
}
