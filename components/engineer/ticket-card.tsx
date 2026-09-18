"use client";

import Link from "next/link";
import { MapPinned, ChevronRight } from "lucide-react";
import { SLACountdown } from "@/components/sla-countdown/sla-countdown";
import { PriorityBadge, TicketStatusBadge } from "@/components/ticket/status-badge";
import { Button } from "@/components/ui/button";
import type { Priority, TicketStatus } from "@prisma/client";

type TicketCardProps = {
  id: string;
  ticket_no: string;
  status: TicketStatus;
  priority: Priority;
  description: string;
  sla_due_at: string | Date | null;
  sla_paused_at?: string | Date | null;
  sla_paused_total_ms?: number;
  tenant: {
    name: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  device: { type: string; serial_number: string } | null;
};

export function EngineerTicketCard({
  id,
  ticket_no,
  status,
  priority,
  description,
  sla_due_at,
  sla_paused_at,
  sla_paused_total_ms,
  tenant,
  device,
}: TicketCardProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${tenant.lat},${tenant.lng}`;

  return (
    <article className="rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-bold text-primary">{ticket_no}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <TicketStatusBadge status={status} />
            <PriorityBadge priority={priority} />
          </div>
        </div>
        <SLACountdown
          dueAt={sla_due_at}
          pausedAt={sla_paused_at}
          pausedTotalMs={sla_paused_total_ms}
        />
      </div>

      <h2 className="text-xl font-bold leading-snug">{tenant.name}</h2>
      <p className="mt-1 text-base text-muted-foreground">{tenant.address}</p>
      <p className="text-sm text-muted-foreground">{tenant.city}</p>

      {device && (
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
          {device.type} · {device.serial_number}
        </p>
      )}

      <p className="mt-3 line-clamp-2 text-base">{description}</p>

      <div className="mt-4 flex flex-col gap-2">
        <Button asChild size="lg" className="h-14 w-full text-base">
          <Link href={`/engineer/tickets/${id}`}>
            Buka Ticket
            <ChevronRight className="h-5 w-5" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 w-full text-base">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <MapPinned className="h-5 w-5" />
            Buka di Google Maps
          </a>
        </Button>
      </div>
    </article>
  );
}
