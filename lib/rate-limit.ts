/** Simple in-memory rate limit (per process). Key → timestamps */
const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const prev = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (prev.length >= limit) {
    buckets.set(key, prev);
    return { ok: false, remaining: 0 };
  }
  prev.push(now);
  buckets.set(key, prev);
  return { ok: true, remaining: limit - prev.length };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}
