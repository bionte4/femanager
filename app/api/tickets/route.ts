import { NextRequest, NextResponse } from "next/server";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { assertMonitoringWebhookAuth } from "@/lib/webhook-auth";
import { createTicketSchema } from "@/lib/validations/tickets";
import {
  createTicketRecord,
  resolveCreateTicketInput,
  ticketListInclude,
} from "@/lib/tickets/service";
import { prisma } from "@/lib/prisma";
import { Prisma, TicketStatus } from "@prisma/client";

/**
 * POST /api/tickets
 * - Admin session → create manual
 * - Webhook → wajib Bearer / X-Webhook-Secret (MONITORING_WEBHOOK_SECRET)
 *   Jangan andalkan tenant_code saja sebagai auth.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      );
    }

    const session = await auth();
    const isAdmin =
      !!session?.user &&
      (ADMIN_ROLES as readonly string[]).includes(session.user.role);
    const isWebhook = assertMonitoringWebhookAuth(req);

    if (!isAdmin && !isWebhook) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolved = await resolveCreateTicketInput(parsed.data);
    const ticket = await createTicketRecord({
      ...resolved,
      changed_by: isAdmin ? session!.user.id : null,
      reported_by:
        parsed.data.reported_by ??
        (isWebhook ? "monitoring-webhook" : session?.user?.name ?? null),
      source: isWebhook ? "WEBHOOK" : "ADMIN",
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
          tenant: ticket.tenant,
          device: ticket.device,
          merged: "merged" in ticket ? ticket.merged === true : false,
        },
      },
      { status: "merged" in ticket && ticket.merged ? 200 : 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tickets — list untuk polling TanStack Query (15 detik)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      !(ADMIN_ROLES as readonly string[]).includes(session.user.role)
    ) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() || undefined;
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? "15") || 15));

    const where: Prisma.TicketWhereInput = {
      AND: [
        status ? { status: status as TicketStatus } : {},
        q
          ? {
              OR: [
                { ticket_no: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { tenant: { name: { contains: q, mode: "insensitive" } } },
                { tenant: { code: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    };

    const [total, items] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: ticketListInclude,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
