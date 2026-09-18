import { NextRequest } from "next/server";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateIntegration, corsJson, corsOptions } from "@/lib/integrationAuth";
import { externalPatchTicketSchema } from "@/lib/validations/external";
import { ticketDetailInclude } from "@/lib/tickets/service";

type Ctx = { params: Promise<{ externalId: string }> | { externalId: string } };

export async function OPTIONS() {
  return corsOptions();
}

async function findExternalTicket(integrationId: string, externalId: string) {
  return prisma.externalTicket.findUnique({
    where: {
      integration_id_external_ticket_id: {
        integration_id: integrationId,
        external_ticket_id: externalId,
      },
    },
    include: {
      internal_ticket: { include: ticketDetailInclude },
    },
  });
}

/**
 * GET /api/v1/external/tickets/[externalId]
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const authResult = await authenticateIntegration(req);
  if ("error" in authResult) return authResult.error;

  const { externalId } = await Promise.resolve(ctx.params);
  const ext = await findExternalTicket(authResult.integration.id, externalId);
  if (!ext) {
    return corsJson({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  const t = ext.internal_ticket;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return corsJson({
    success: true,
    data: {
      external_ticket_id: ext.external_ticket_id,
      internal_ticket_no: t.ticket_no,
      internal_ticket_id: t.id,
      status: t.status,
      priority: t.priority,
      type: t.type,
      description: t.description,
      sla_due_at: t.sla_due_at,
      resolved_at: t.resolved_at,
      tenant: {
        code: t.tenant.code,
        name: t.tenant.name,
        city: t.tenant.city,
      },
      device: t.device
        ? {
            type: t.device.type,
            serial_number: t.device.serial_number,
            status: t.device.status,
          }
        : null,
      engineer: t.assigned_engineer
        ? {
            name: t.assigned_engineer.full_name,
            phone: t.assigned_engineer.phone,
          }
        : null,
      timeline: t.logs.map((l) => ({
        status_from: l.status_from,
        status_to: l.status_to,
        notes: l.notes,
        photos: l.photo_url.map((u) =>
          u.startsWith("http") ? u : `${base}${u.startsWith("/") ? u : `/${u}`}`
        ),
        lat: l.lat,
        lng: l.lng,
        created_at: l.created_at,
        changed_by: l.changer?.full_name ?? null,
      })),
      photos: t.logs
        .flatMap((l) => l.photo_url)
        .map((u) => (u.startsWith("http") ? u : `${base}${u.startsWith("/") ? u : `/${u}`}`)),
    },
  });
}

/**
 * PATCH /api/v1/external/tickets/[externalId]
 * Customer close / cancel
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const authResult = await authenticateIntegration(req);
  if ("error" in authResult) return authResult.error;

  const { externalId } = await Promise.resolve(ctx.params);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return corsJson({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = externalPatchTicketSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ext = await findExternalTicket(authResult.integration.id, externalId);
  if (!ext) {
    return corsJson({ success: false, error: "Ticket not found" }, { status: 404 });
  }

  const ticket = ext.internal_ticket;
  if (
    ticket.status === TicketStatus.CLOSED ||
    ticket.status === TicketStatus.RESOLVED
  ) {
    return corsJson({
      success: true,
      message: "Ticket already closed/resolved",
      status: ticket.status,
    });
  }

  const now = new Date();
  const notes =
    parsed.data.notes ||
    (parsed.data.status === "cancelled"
      ? "Dibatalkan oleh customer via Open API"
      : "Ditutup oleh customer via Open API");

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CLOSED,
        resolved_at: ticket.resolved_at ?? now,
      },
    });
    await tx.ticketLog.create({
      data: {
        ticket_id: ticket.id,
        status_from: ticket.status,
        status_to: TicketStatus.CLOSED,
        notes,
        photo_url: [],
      },
    });
  });

  const { triggerExternalWebhook } = await import("@/lib/webhook");
  void triggerExternalWebhook(ticket.id, TicketStatus.CLOSED);

  return corsJson({
    success: true,
    status: "CLOSED",
    internal_ticket_no: ticket.ticket_no,
  });
}
