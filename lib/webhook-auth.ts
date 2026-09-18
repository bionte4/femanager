import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Auth shared secret untuk webhook monitoring / ticket ingress.
 * Header: Authorization: Bearer <MONITORING_WEBHOOK_SECRET>
 *    atau: X-Webhook-Secret: <MONITORING_WEBHOOK_SECRET>
 * Fail-closed: secret kosong → selalu reject.
 */
export function assertMonitoringWebhookAuth(req: NextRequest): boolean {
  const secret = process.env.MONITORING_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  const bearer =
    authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;
  const headerSecret = req.headers.get("x-webhook-secret")?.trim() ?? null;
  const provided = bearer || headerSecret;
  if (!provided) return false;

  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
