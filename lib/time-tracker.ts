import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeSlaPhases } from "@/lib/sla-phases";

/**
 * Hitung ulang ringkasan waktu kerja dari ticket + logs.
 * Dipanggil setelah setiap perubahan status relevan.
 */
export async function recomputeTicketTimeSummary(
  ticketId: string
): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      assigned_engineer_id: true,
      created_at: true,
      response_at: true,
      accepted_at: true,
      resolved_at: true,
      sla_paused_at: true,
      sla_paused_total_ms: true,
      logs: {
        orderBy: { created_at: "asc" },
        select: {
          status_to: true,
          created_at: true,
          notes: true,
        },
      },
    },
  });
  if (!ticket) return;

  const phases = computeSlaPhases({
    created_at: ticket.created_at,
    response_at: ticket.response_at,
    accepted_at: ticket.accepted_at,
    resolved_at: ticket.resolved_at,
    sla_paused_at: ticket.sla_paused_at,
    sla_paused_total_ms: ticket.sla_paused_total_ms,
    logs: ticket.logs,
  });

  const assignedAt =
    ticket.response_at ??
    ticket.logs.find((l) => l.status_to === TicketStatus.ASSIGNED)?.created_at ??
    null;
  const onTheWayAt =
    ticket.logs.find((l) => l.status_to === TicketStatus.ON_THE_WAY)
      ?.created_at ?? null;
  const queueEnd = onTheWayAt ?? ticket.accepted_at;
  const queue_ms =
    assignedAt && queueEnd
      ? Math.max(0, queueEnd.getTime() - assignedAt.getTime())
      : 0;

  await prisma.ticketTimeSummary.upsert({
    where: { ticket_id: ticketId },
    create: {
      ticket_id: ticketId,
      engineer_id: ticket.assigned_engineer_id,
      queue_ms,
      travel_ms: phases.travel_ms ?? 0,
      onsite_ms: phases.onsite_ms ?? 0,
      repair_ms: phases.repair_ms ?? 0,
      pause_ms: phases.pause_ms,
      active_ms: phases.active_ms ?? 0,
      total_ms: phases.total_ms ?? 0,
      computed_at: new Date(),
    },
    update: {
      engineer_id: ticket.assigned_engineer_id,
      queue_ms,
      travel_ms: phases.travel_ms ?? 0,
      onsite_ms: phases.onsite_ms ?? 0,
      repair_ms: phases.repair_ms ?? 0,
      pause_ms: phases.pause_ms,
      active_ms: phases.active_ms ?? 0,
      total_ms: phases.total_ms ?? 0,
      computed_at: new Date(),
    },
  });
}
