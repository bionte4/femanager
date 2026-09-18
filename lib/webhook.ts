import { createHmac } from "crypto";
import type { Integration, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WebhookEvent =
  | "ticket.assigned"
  | "ticket.on_the_way"
  | "ticket.on_site"
  | "ticket.in_progress"
  | "ticket.resolved"
  | "ticket.closed"
  | "ticket.escalated"
  | "ticket.pending_sparepart"
  | "ticket.test";

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: {
    external_ticket_id: string;
    internal_ticket_no: string;
    status: string;
    tenant_code: string;
    engineer: { name: string; phone: string } | null;
    notes: string | null;
    photos: string[];
    lat: number | null;
    lng: number | null;
    resolved_at: string | null;
  };
};

const RETRY_DELAYS_MS = [5_000, 30_000, 60_000];

export function statusToWebhookEvent(status: TicketStatus): WebhookEvent | null {
  const map: Partial<Record<TicketStatus, WebhookEvent>> = {
    ASSIGNED: "ticket.assigned",
    ON_THE_WAY: "ticket.on_the_way",
    ON_SITE: "ticket.on_site",
    IN_PROGRESS: "ticket.in_progress",
    RESOLVED: "ticket.resolved",
    CLOSED: "ticket.closed",
    ESCALATED: "ticket.escalated",
    PENDING_SPAREPART: "ticket.pending_sparepart",
  };
  return map[status] ?? null;
}

/** HMAC SHA256 hex signature */
export function signPayload(payload: unknown, secret: string): string {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return createHmac("sha256", secret).update(body).digest("hex");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function absolutePhotoUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function buildWebhookPayload(
  ticketId: string,
  event: WebhookEvent
): Promise<{ payload: WebhookPayload; externalTicketId: string } | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: true,
      device: true,
      assigned_engineer: true,
      logs: { orderBy: { created_at: "desc" }, take: 20 },
      external_ticket: true,
    },
  });

  if (!ticket?.external_ticket) return null;

  const latestLog = ticket.logs[0];
  const photos = ticket.logs.flatMap((l) => l.photo_url).map(absolutePhotoUrl);

  return {
    externalTicketId: ticket.external_ticket.id,
    payload: {
      event,
      timestamp: new Date().toISOString(),
      data: {
        external_ticket_id: ticket.external_ticket.external_ticket_id,
        internal_ticket_no: ticket.ticket_no,
        status: ticket.status,
        tenant_code: ticket.tenant.code,
        engineer: ticket.assigned_engineer
          ? {
              name: ticket.assigned_engineer.full_name,
              phone: ticket.assigned_engineer.phone,
            }
          : null,
        notes: latestLog?.notes ?? null,
        photos,
        lat: latestLog?.lat ?? null,
        lng: latestLog?.lng ?? null,
        resolved_at: ticket.resolved_at?.toISOString() ?? null,
      },
    },
  };
}

type SendResult = {
  success: boolean;
  status?: number;
  body?: string;
  attempts: number;
  error?: string;
};

/**
 * Kirim webhook ke customer dengan retry 3x (delay 5s, 30s, 60s).
 * Gagal semua → log + simpan last_response, jangan throw.
 */
export async function sendToCustomer(
  integration: Pick<Integration, "id" | "webhook_url" | "webhook_secret" | "customer_name">,
  event: WebhookEvent,
  ticketId: string
): Promise<SendResult> {
  if (!integration.webhook_url) {
    return { success: false, attempts: 0, error: "webhook_url kosong" };
  }

  const built = await buildWebhookPayload(ticketId, event);
  if (!built) {
    return { success: false, attempts: 0, error: "ExternalTicket tidak ditemukan" };
  }

  const { payload, externalTicketId } = built;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FE-Track-Webhook/1.0",
    "X-FETrack-Event": event,
  };
  if (integration.webhook_secret) {
    headers["X-Webhook-Signature"] = signPayload(body, integration.webhook_secret);
  }

  let last: SendResult = { success: false, attempts: 0 };

  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    last.attempts = i + 1;
    try {
      console.log(
        `[webhook] → ${integration.customer_name} event=${event} attempt=${i + 1}`
      );
      const res = await fetch(integration.webhook_url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text().catch(() => "");
      last = {
        success: res.ok,
        status: res.status,
        body: text.slice(0, 2000),
        attempts: i + 1,
      };

      if (res.ok) {
        console.log(`[webhook] ✓ ${event} status=${res.status}`);
        break;
      }
      console.warn(`[webhook] ✗ ${event} status=${res.status}`);
    } catch (e) {
      last = {
        success: false,
        attempts: i + 1,
        error: e instanceof Error ? e.message : "fetch failed",
      };
      console.warn(`[webhook] ✗ ${event} error=`, last.error);
    }

    if (i < RETRY_DELAYS_MS.length - 1) {
      await sleep(RETRY_DELAYS_MS[i]);
    }
  }

  // Simpan last_response di ExternalTicket
  try {
    await prisma.externalTicket.update({
      where: { id: externalTicketId },
      data: {
        last_response: {
          event,
          success: last.success,
          status: last.status ?? null,
          body: last.body ?? null,
          error: last.error ?? null,
          attempts: last.attempts,
          sent_at: new Date().toISOString(),
        },
      },
    });
  } catch (e) {
    console.error("[webhook] gagal simpan last_response:", e);
  }

  // Gagal semua attempt → masuk DLQ untuk retry async
  if (!last.success) {
    try {
      const { enqueueWebhookDeadLetter } = await import("@/lib/webhook-dlq");
      await enqueueWebhookDeadLetter({
        integration_id: integration.id,
        ticket_id: ticketId,
        external_ticket_id: externalTicketId,
        event,
        payload,
        attempts: last.attempts,
        last_error: last.error ?? last.body ?? `HTTP ${last.status}`,
        last_http_status: last.status ?? null,
      });
      console.warn(`[webhook] → DLQ event=${event} ticket=${ticketId}`);
    } catch (e) {
      console.error("[webhook] gagal enqueue DLQ:", e);
    }
  }

  return last;
}

/** Kirim dummy test webhook */
export async function sendTestWebhook(
  integration: Pick<Integration, "id" | "webhook_url" | "webhook_secret" | "customer_name">
): Promise<SendResult> {
  if (!integration.webhook_url) {
    return { success: false, attempts: 0, error: "webhook_url kosong" };
  }

  const payload: WebhookPayload = {
    event: "ticket.test",
    timestamp: new Date().toISOString(),
    data: {
      external_ticket_id: "TEST-001",
      internal_ticket_no: "FE-TEST-0001",
      status: "ASSIGNED",
      tenant_code: "DEMO-001",
      engineer: { name: "Demo Engineer", phone: "081200000000" },
      notes: "Test webhook dari FE-Track admin",
      photos: [],
      lat: -6.2,
      lng: 106.8,
      resolved_at: null,
    },
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "FE-Track-Webhook/1.0",
    "X-FETrack-Event": "ticket.test",
  };
  if (integration.webhook_secret) {
    headers["X-Webhook-Signature"] = signPayload(body, integration.webhook_secret);
  }

  try {
    const res = await fetch(integration.webhook_url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text().catch(() => "");
    return {
      success: res.ok,
      status: res.status,
      body: text.slice(0, 2000),
      attempts: 1,
    };
  } catch (e) {
    return {
      success: false,
      attempts: 1,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

/**
 * Trigger async webhook jika ticket punya ExternalTicket.
 * Non-blocking — panggil tanpa await di path kritis (atau pakai after()).
 */
export async function triggerExternalWebhook(ticketId: string, status: TicketStatus) {
  try {
    const event = statusToWebhookEvent(status);
    if (!event) return;

    const ext = await prisma.externalTicket.findUnique({
      where: { internal_ticket_id: ticketId },
      include: { integration: true },
    });
    if (!ext || !ext.integration.is_active || !ext.integration.webhook_url) return;

    await sendToCustomer(ext.integration, event, ticketId);
  } catch (e) {
    console.error("[webhook] trigger gagal:", e);
  }
}
