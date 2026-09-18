/**
 * Rate limit in-memory sederhana: max 60 request / menit per api_key.
 * Reset otomatis tiap window 60 detik.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const LIMIT = 60;
const WINDOW_MS = 60_000;

export function checkRateLimit(apiKey: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let bucket = buckets.get(apiKey);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(apiKey, bucket);
  }

  if (bucket.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: LIMIT - bucket.count,
    resetAt: bucket.resetAt,
  };
}
