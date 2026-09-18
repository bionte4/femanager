import type { Priority, TicketStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<
    TicketStatus,
    { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }
  > = {
    OPEN: { label: "Open", variant: "secondary" },
    ASSIGNED: { label: "Assigned", variant: "default" },
    ON_THE_WAY: { label: "On the way", variant: "warning" },
    ON_SITE: { label: "On site", variant: "warning" },
    IN_PROGRESS: { label: "In progress", variant: "default" },
    PENDING_SPAREPART: { label: "Pending sparepart", variant: "warning" },
    ESCALATED: { label: "Escalated", variant: "destructive" },
    PENDING_L1: { label: "Pending L1", variant: "warning" },
    PENDING_REVIEW: { label: "Pending review", variant: "destructive" },
    RESOLVED: { label: "Resolved", variant: "success" },
    CLOSED: { label: "Closed", variant: "outline" },
  };

  const item = map[status];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, { variant: "secondary" | "default" | "warning" | "destructive" }> = {
    LOW: { variant: "secondary" },
    MEDIUM: { variant: "default" },
    HIGH: { variant: "warning" },
    CRITICAL: { variant: "destructive" },
  };
  return <Badge variant={map[priority].variant}>{priority}</Badge>;
}
