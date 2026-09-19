import { NextRequest, NextResponse } from "next/server";
import type { Integration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  API_KEY_PREFIX_LEN,
  apiKeyPrefix,
  validateApiKey,
} from "@/lib/apiKey";
import { checkRateLimit } from "@/lib/rateLimit";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-KEY",
  "Access-Control-Max-Age": "86400",
};

export function corsJson(
  data: unknown,
  init?: { status?: number; headers?: HeadersInit }
) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { ...CORS_HEADERS, ...(init?.headers as Record<string, string>) },
  });
}

export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Validasi header X-API-KEY → Integration aktif.
 * Lookup by prefix + bcrypt verify (tanpa plain key di DB).
 */
export async function authenticateIntegration(
  req: NextRequest
): Promise<{ integration: Integration } | { error: NextResponse }> {
  const apiKey = req.headers.get("x-api-key")?.trim();
  if (!apiKey || apiKey.length < API_KEY_PREFIX_LEN + 4) {
    return {
      error: corsJson(
        { success: false, error: "Missing X-API-KEY header" },
        { status: 401 }
      ),
    };
  }

  const rate = checkRateLimit(apiKey);
  if (!rate.allowed) {
    return {
      error: corsJson(
        { success: false, error: "Rate limit exceeded (max 60 req/min)" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  const prefix = apiKeyPrefix(apiKey);
  const candidates = await prisma.integration.findMany({
    where: { api_key_prefix: prefix, is_active: true },
    take: 5,
  });

  let matched: Integration | null = null;
  for (const row of candidates) {
    const ok = await validateApiKey(apiKey, row.api_key_hash);
    if (ok) {
      matched = row;
      break;
    }
  }

  // Legacy fallback: baris yang belum di-clear plain (seharusnya sudah NULL)
  if (!matched) {
    const legacy = await prisma.integration.findFirst({
      where: { api_key: apiKey, is_active: true },
    });
    if (legacy) {
      const ok = await validateApiKey(apiKey, legacy.api_key_hash);
      if (ok) matched = legacy;
    }
  }

  if (!matched) {
    return {
      error: corsJson(
        { success: false, error: "Invalid or inactive API key" },
        { status: 401 }
      ),
    };
  }

  void prisma.integration
    .update({
      where: { id: matched.id },
      data: { last_used_at: new Date() },
    })
    .catch(() => undefined);

  return { integration: matched };
}
