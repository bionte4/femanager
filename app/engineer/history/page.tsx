import { getMyHistoryTickets } from "@/app/actions/engineer-tickets";
import { TicketStatusBadge } from "@/components/ticket/status-badge";

export default async function EngineerHistoryPage() {
  const tickets = await getMyHistoryTickets();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-base text-muted-foreground">
          Ticket yang sudah selesai
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-muted/30 px-4 py-12 text-center text-lg text-muted-foreground">
          Belum ada history
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-primary">
                    {t.ticket_no}
                  </p>
                  <p className="text-lg font-semibold">{t.tenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.device?.type ?? "—"} · {t.tenant.city}
                  </p>
                </div>
                <TicketStatusBadge status={t.status} />
              </div>
              {t.resolved_at && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selesai {new Date(t.resolved_at).toLocaleString("id-ID")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
