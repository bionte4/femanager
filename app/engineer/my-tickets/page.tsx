import Link from "next/link";
import { getMyActiveTickets } from "@/app/actions/engineer-tickets";
import { EngineerTicketCard } from "@/components/engineer/ticket-card";
import { OfflineBadge } from "@/components/engineer/offline-badge";

export default async function MyTicketsPage() {
  const tickets = await getMyActiveTickets();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Saya</h1>
          <p className="text-base text-muted-foreground">
            {tickets.length} ticket aktif
          </p>
        </div>
        <OfflineBadge />
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-muted/30 px-4 py-16 text-center">
          <p className="text-xl font-semibold text-muted-foreground">
            Belum ada ticket aktif
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            Ticket yang di-assign ke kamu akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <EngineerTicketCard
              key={t.id}
              id={t.id}
              ticket_no={t.ticket_no}
              status={t.status}
              priority={t.priority}
              description={t.description}
              sla_due_at={t.sla_due_at}
              sla_paused_at={t.sla_paused_at}
              sla_paused_total_ms={t.sla_paused_total_ms}
              tenant={t.tenant}
              device={t.device}
            />
          ))}
        </div>
      )}

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Lihat{" "}
        <Link href="/engineer/history" className="font-semibold text-primary underline">
          History
        </Link>
      </p>
    </div>
  );
}
