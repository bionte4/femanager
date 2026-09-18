"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { generateApiKey, hashApiKey, maskApiKey } from "@/lib/apiKey";
import { sendTestWebhook, sendToCustomer, type WebhookEvent } from "@/lib/webhook";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

const createSchema = z.object({
  customer_name: z.string().min(2).max(100),
  webhook_url: z.string().url().optional().or(z.literal("")),
  webhook_secret: z.string().max(200).optional().or(z.literal("")),
});

export async function listIntegrations() {
  await requireAdmin();
  const items = await prisma.integration.findMany({
    orderBy: { created_at: "desc" },
    include: {
      _count: { select: { external_tickets: true } },
    },
  });

  return items.map((i) => ({
    id: i.id,
    customer_name: i.customer_name,
    api_key_masked: maskApiKey(i.api_key),
    webhook_url: i.webhook_url,
    is_active: i.is_active,
    last_used_at: i.last_used_at?.toISOString() ?? null,
    created_at: i.created_at.toISOString(),
    external_tickets_count: i._count.external_tickets,
  }));
}

export async function getIntegrationDetail(id: string) {
  await requireAdmin();
  const integration = await prisma.integration.findUnique({
    where: { id },
    include: {
      external_tickets: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: {
          internal_ticket: {
            select: {
              ticket_no: true,
              status: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  if (!integration) return null;

  return {
    id: integration.id,
    customer_name: integration.customer_name,
    api_key_masked: maskApiKey(integration.api_key),
    webhook_url: integration.webhook_url,
    webhook_secret: integration.webhook_secret
      ? maskApiKey(integration.webhook_secret)
      : null,
    is_active: integration.is_active,
    last_used_at: integration.last_used_at?.toISOString() ?? null,
    created_at: integration.created_at.toISOString(),
    external_tickets: integration.external_tickets.map((e) => {
      const last = e.last_response as { success?: boolean; status?: number; event?: string } | null;
      return {
        id: e.id,
        external_ticket_id: e.external_ticket_id,
        internal_ticket_id: e.internal_ticket_id,
        internal_ticket_no: e.internal_ticket.ticket_no,
        status: e.internal_ticket.status,
        created_at: e.created_at.toISOString(),
        last_response_ok: last?.success ?? null,
        last_response_status: last?.status ?? null,
        last_event: last?.event ?? null,
      };
    }),
  };
}

export async function createIntegration(input: {
  customer_name: string;
  webhook_url?: string;
  webhook_secret?: string;
}): Promise<ActionResult<{ id: string; api_key: string }>> {
  try {
    await requireAdmin();
    const data = createSchema.parse(input);
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    const created = await prisma.integration.create({
      data: {
        customer_name: data.customer_name,
        api_key: apiKey,
        api_key_hash: apiKeyHash,
        webhook_url: data.webhook_url || null,
        webhook_secret: data.webhook_secret || null,
      },
    });

    revalidatePath("/admin/integrations");
    return { success: true, data: { id: created.id, api_key: apiKey } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal create integration",
    };
  }
}

export async function toggleIntegration(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.integration.update({ where: { id }, data: { is_active } });
    revalidatePath("/admin/integrations");
    revalidatePath(`/admin/integrations/${id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update" };
  }
}

export async function updateIntegrationWebhook(
  id: string,
  input: { webhook_url?: string; webhook_secret?: string }
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.integration.update({
      where: { id },
      data: {
        webhook_url: input.webhook_url || null,
        ...(input.webhook_secret !== undefined
          ? { webhook_secret: input.webhook_secret || null }
          : {}),
      },
    });
    revalidatePath(`/admin/integrations/${id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal update" };
  }
}

export async function testIntegrationWebhook(
  id: string
): Promise<ActionResult<{ status?: number; body?: string }>> {
  try {
    await requireAdmin();
    const integration = await prisma.integration.findUnique({ where: { id } });
    if (!integration) return { success: false, error: "Integration tidak ditemukan" };

    const result = await sendTestWebhook(integration);
    if (!result.success) {
      return {
        success: false,
        error: result.error || `HTTP ${result.status ?? "?"} ${result.body ?? ""}`,
      };
    }
    return {
      success: true,
      data: { status: result.status, body: result.body },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Test gagal" };
  }
}

export async function resendWebhook(
  externalTicketId: string,
  event?: WebhookEvent
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const ext = await prisma.externalTicket.findUnique({
      where: { id: externalTicketId },
      include: { integration: true, internal_ticket: true },
    });
    if (!ext) return { success: false, error: "External ticket tidak ditemukan" };
    if (!ext.integration.webhook_url) {
      return { success: false, error: "webhook_url kosong" };
    }

    const ev =
      event ||
      (`ticket.${ext.internal_ticket.status.toLowerCase()}` as WebhookEvent);

    const result = await sendToCustomer(ext.integration, ev, ext.internal_ticket_id);
    revalidatePath(`/admin/integrations/${ext.integration_id}`);
    if (!result.success) {
      return {
        success: false,
        error: result.error || `HTTP ${result.status}`,
      };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Resend gagal" };
  }
}

export async function deleteIntegration(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.integration.delete({ where: { id } });
    revalidatePath("/admin/integrations");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Gagal hapus" };
  }
}
