import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WebhookEvent, WebhookPayload } from "@/lib/webhook";

const MAX_DLQ_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 60_000; // 1 menit

export async function enqueueWebhookDeadLetter(params: {
  integration_id: string;
  ticket_id?: string | null;
  external_ticket_id?: string | null;
  event: WebhookEvent | string;
  payload: WebhookPayload | Record<string, unknown>;
  attempts: number;
  last_error?: string | null;
  last_http_status?: number | null;
}) {
  return prisma.webhookDeadLetter.create({
    data: {
      integration_id: params.integration_id,
      ticket_id: params.ticket_id ?? null,
      external_ticket_id: params.external_ticket_id ?? null,
      event: params.event,
      payload: params.payload as Prisma.InputJsonValue,
      attempts: params.attempts,
      last_error: params.last_error ?? null,
      last_http_status: params.last_http_status ?? null,
      status: "PENDING",
      next_retry_at: new Date(Date.now() + BASE_BACKOFF_MS),
    },
  });
}

function nextBackoff(attempts: number): Date {
  // Exponential: 1m, 2m, 4m, 8m… capped 1h
  const ms = Math.min(
    BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempts - 1)),
    60 * 60 * 1000
  );
  return new Date(Date.now() + ms);
}

/**
 * Process PENDING DLQ yang next_retry_at sudah lewat.
 */
export async function processWebhookDeadLetters(limit = 20): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  dead: number;
}> {
  const due = await prisma.webhookDeadLetter.findMany({
    where: {
      status: { in: ["PENDING", "RETRYING"] },
      next_retry_at: { lte: new Date() },
    },
    include: { integration: true },
    orderBy: { next_retry_at: "asc" },
    take: limit,
  });

  let succeeded = 0;
  let failed = 0;
  let dead = 0;

  const { signPayload } = await import("@/lib/webhook");

  for (const row of due) {
    if (!row.integration.webhook_url || !row.integration.is_active) {
      await prisma.webhookDeadLetter.update({
        where: { id: row.id },
        data: {
          status: "DEAD",
          last_error: "Integration inactive / no webhook_url",
          resolved_at: new Date(),
        },
      });
      dead += 1;
      continue;
    }

    await prisma.webhookDeadLetter.update({
      where: { id: row.id },
      data: { status: "RETRYING" },
    });

    const body = JSON.stringify(row.payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "FE-Track-Webhook/1.0-DLQ",
      "X-FETrack-Event": row.event,
      "X-FETrack-DLQ-Id": row.id,
    };
    if (row.integration.webhook_secret) {
      headers["X-Webhook-Signature"] = signPayload(
        body,
        row.integration.webhook_secret
      );
    }

    try {
      const res = await fetch(row.integration.webhook_url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text().catch(() => "");
      const attempts = row.attempts + 1;

      if (res.ok) {
        await prisma.webhookDeadLetter.update({
          where: { id: row.id },
          data: {
            status: "SUCCEEDED",
            attempts,
            last_http_status: res.status,
            last_error: null,
            resolved_at: new Date(),
          },
        });
        succeeded += 1;
      } else if (attempts >= MAX_DLQ_ATTEMPTS) {
        await prisma.webhookDeadLetter.update({
          where: { id: row.id },
          data: {
            status: "DEAD",
            attempts,
            last_http_status: res.status,
            last_error: text.slice(0, 500) || `HTTP ${res.status}`,
            resolved_at: new Date(),
          },
        });
        dead += 1;
      } else {
        await prisma.webhookDeadLetter.update({
          where: { id: row.id },
          data: {
            status: "PENDING",
            attempts,
            last_http_status: res.status,
            last_error: text.slice(0, 500) || `HTTP ${res.status}`,
            next_retry_at: nextBackoff(attempts),
          },
        });
        failed += 1;
      }
    } catch (e) {
      const attempts = row.attempts + 1;
      const err = e instanceof Error ? e.message : "fetch failed";
      if (attempts >= MAX_DLQ_ATTEMPTS) {
        await prisma.webhookDeadLetter.update({
          where: { id: row.id },
          data: {
            status: "DEAD",
            attempts,
            last_error: err,
            resolved_at: new Date(),
          },
        });
        dead += 1;
      } else {
        await prisma.webhookDeadLetter.update({
          where: { id: row.id },
          data: {
            status: "PENDING",
            attempts,
            last_error: err,
            next_retry_at: nextBackoff(attempts),
          },
        });
        failed += 1;
      }
    }
  }

  return { processed: due.length, succeeded, failed, dead };
}

export async function listWebhookDeadLetters(params?: {
  status?: string;
  limit?: number;
}) {
  return prisma.webhookDeadLetter.findMany({
    where: params?.status ? { status: params.status } : undefined,
    include: {
      integration: { select: { id: true, customer_name: true } },
    },
    orderBy: { created_at: "desc" },
    take: params?.limit ?? 100,
  });
}

export async function replayWebhookDeadLetter(id: string) {
  await prisma.webhookDeadLetter.update({
    where: { id },
    data: {
      status: "PENDING",
      next_retry_at: new Date(),
      resolved_at: null,
    },
  });
  return processWebhookDeadLetters(1);
}
