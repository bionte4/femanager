import { timingSafeEqual } from "crypto";

/**
 * Auth cron jobs — fail-closed.
 * Hanya Authorization: Bearer <CRON_SECRET> (tanpa query ?secret=).
 */
export function assertCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;

  try {
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
