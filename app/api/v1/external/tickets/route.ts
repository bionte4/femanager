import { NextRequest } from "next/server";
import { Priority, TicketType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateIntegration, corsJson, corsOptions } from "@/lib/integrationAuth";
import {
  externalCreateTicketSchema,
  PRIORITY_MAP,
} from "@/lib/validations/external";
import { createTicketRecord } from "@/lib/tickets/service";

export async function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/v1/external/tickets
 * Customer push ticket baru → create + ExternalTicket + autoDispatch
 */
export async function POST(req: NextRequest) {
  const authResult = await authenticateIntegration(req);
  if ("error" in authResult) return authResult.error;
  const { integration } = authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return corsJson({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = externalCreateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { code: input.tenant_code },
    });
    if (!tenant) {
      return corsJson(
        { success: false, error: "Tenant code not found" },
        { status: 404 }
      );
    }

    let deviceId: string | null = null;
    if (input.device_serial) {
      const device = await prisma.device.findUnique({
        where: { serial_number: input.device_serial },
      });
      if (!device || device.tenant_id !== tenant.id) {
        return corsJson(
          { success: false, error: "Device serial not found for this tenant" },
          { status: 404 }
        );
      }
      deviceId = device.id;
    }

    const existing = await prisma.externalTicket.findUnique({
      where: {
        integration_id_external_ticket_id: {
          integration_id: integration.id,
          external_ticket_id: input.external_ticket_id,
        },
      },
    });
    if (existing) {
      return corsJson(
        {
          success: false,
          error: "external_ticket_id already exists",
          internal_ticket_id: existing.internal_ticket_id,
        },
        { status: 409 }
      );
    }

    const priority = PRIORITY_MAP[input.priority] as Priority;
    const type = input.type as TicketType;

    const ticket = await createTicketRecord({
      tenant_id: tenant.id,
      device_id: deviceId,
      type,
      priority,
      description: input.description,
      reported_by: input.reported_by ?? integration.customer_name,
      source: "EXTERNAL",
    });

    const merged = "merged" in ticket && ticket.merged === true;

    // Link external ID — skip create baru jika sudah ada row untuk internal (merge)
    const existingLink = await prisma.externalTicket.findFirst({
      where: {
        OR: [
          {
            integration_id: integration.id,
            external_ticket_id: input.external_ticket_id,
          },
          { internal_ticket_id: ticket.id, integration_id: integration.id },
        ],
      },
    });

    if (!existingLink) {
      await prisma.externalTicket.create({
        data: {
          integration_id: integration.id,
          external_ticket_id: input.external_ticket_id,
          internal_ticket_id: ticket.id,
          last_payload: input as object,
        },
      });
    } else {
      await prisma.externalTicket.update({
        where: { id: existingLink.id },
        data: { last_payload: input as object },
      });
    }

    // Jika sudah ASSIGNED dari auto-dispatch, push webhook
    if (!merged && ticket.status === "ASSIGNED") {
      const { triggerExternalWebhook } = await import("@/lib/webhook");
      void triggerExternalWebhook(ticket.id, ticket.status);
    }

    return corsJson(
      {
        success: true,
        internal_ticket_no: ticket.ticket_no,
        internal_ticket_id: ticket.id,
        sla_due_at: ticket.sla_due_at,
        status: ticket.status,
        merged,
        assigned_engineer: ticket.assigned_engineer
          ? {
              name: ticket.assigned_engineer.full_name,
              phone: ticket.assigned_engineer.phone,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[external/tickets POST]", e);
    return corsJson(
      {
        success: false,
        error: e instanceof Error ? e.message : "Internal error",
      },
      { status: 500 }
    );
  }
}
