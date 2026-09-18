import { NextRequest, NextResponse } from "next/server";
import type { Integration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/apiKey";
import { checkRateLimit } from "@/lib/rateLimit";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-KEY",
  "Access-Control-Max-Age": "86400",
};

export function corsJson(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
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
 * Juga enforce rate limit 60/min.
 */
export async function authenticateIntegration(
  req: NextRequest
): Promise<{ integration: Integration } | { error: NextResponse }> {
  const apiKey = req.headers.get("x-api-key")?.trim();
  if (!apiKey) {
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

  // Lookup by plain key (schema unique), lalu verifikasi hash
  const integration = await prisma.integration.findUnique({
    where: { api_key: apiKey },
  });

  if (!integration || !integration.is_active) {
    return {
      error: corsJson(
        { success: false, error: "Invalid or inactive API key" },
        { status: 401 }
      ),
    };
  }

  const valid = await validateApiKey(apiKey, integration.api_key_hash);
  if (!valid) {
    return {
      error: corsJson(
        { success: false, error: "Invalid or inactive API key" },
        { status: 401 }
      ),
    };
  }

  // Update last used (fire-and-forget)
  void prisma.integration
    .update({
      where: { id: integration.id },
      data: { last_used_at: new Date() },
    })
    .catch(() => undefined);

  return { integration };
}
