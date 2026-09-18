import { NextRequest, NextResponse } from "next/server";
import { assertMonitoringWebhookAuth } from "@/lib/webhook-auth";
import { createTicketSchema } from "@/lib/validations/tickets";
import {
  createTicketRecord,
  resolveCreateTicketInput,
} from "@/lib/tickets/service";

/**
 * Webhook monitoring (Zabbix / Uptime Kuma)
 * POST /api/webhooks/monitoring
 * Auth: Authorization: Bearer <MONITORING_WEBHOOK_SECRET>
 *    atau X-Webhook-Secret: <MONITORING_WEBHOOK_SECRET>
 */
export async function POST(req: NextRequest) {
  try {
    if (!assertMonitoringWebhookAuth(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createTicketSchema.safeParse({
      tenant_id: body.tenant_id ?? null,
      tenant_code: body.tenant_code ?? null,
      device_id: body.device_id ?? null,
      device_serial: body.device_serial ?? null,
      type: body.type ?? "INCIDENT",
      priority: body.priority ?? "HIGH",
      description: body.description ?? body.message ?? "Alert dari monitoring",
      reported_by: body.reported_by ?? "monitoring-webhook",
      source: "WEBHOOK",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }

    const resolved = await resolveCreateTicketInput(parsed.data);
    const ticket = await createTicketRecord({
      ...resolved,
      reported_by: parsed.data.reported_by ?? "monitoring-webhook",
      source: "WEBHOOK",
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: ticket.id,
          ticket_no: ticket.ticket_no,
          status: ticket.status,
          sla_due_at: ticket.sla_due_at,
          assigned_engineer: ticket.assigned_engineer,
          dispatch_attempts: ticket.dispatch_attempts,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
