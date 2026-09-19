"use server";

import { revalidatePath } from "next/cache";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { requireAppAdmin } from "@/lib/rbac";
import {
  listWebhookDeadLetters,
  processWebhookDeadLetters,
  replayWebhookDeadLetter,
} from "@/lib/webhook-dlq";
import { getWarRoomSnapshot } from "@/lib/war-room";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  return requireAppAdmin();
}

export async function fetchWarRoomSnapshotAction() {
  await requireAdmin();
  return getWarRoomSnapshot();
}

export async function fetchWebhookDlqAction(status?: string) {
  await requireAdmin();
  const rows = await listWebhookDeadLetters({
    status: status && status !== "all" ? status : undefined,
    limit: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    status: r.status,
    attempts: r.attempts,
    last_error: r.last_error,
    last_http_status: r.last_http_status,
    next_retry_at: r.next_retry_at.toISOString(),
    created_at: r.created_at.toISOString(),
    resolved_at: r.resolved_at?.toISOString() ?? null,
    ticket_id: r.ticket_id,
    customer_name: r.integration.customer_name,
    integration_id: r.integration.id,
  }));
}

export async function replayDlqAction(id: string) {
  try {
    await requireAdmin();
    const result = await replayWebhookDeadLetter(id);
    revalidatePath("/admin/integrations/dlq");
    return { success: true as const, data: result };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Replay gagal",
    };
  }
}

export async function processDlqNowAction() {
  try {
    await requireAdmin();
    const result = await processWebhookDeadLetters(30);
    revalidatePath("/admin/integrations/dlq");
    return { success: true as const, data: result };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Process gagal",
    };
  }
}

export async function markDlqDeadAction(id: string) {
  try {
    await requireAdmin();
    await prisma.webhookDeadLetter.update({
      where: { id },
      data: { status: "DEAD", resolved_at: new Date() },
    });
    revalidatePath("/admin/integrations/dlq");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Gagal",
    };
  }
}
