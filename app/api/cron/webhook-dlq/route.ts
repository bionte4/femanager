import { NextRequest, NextResponse } from "next/server";
import { processWebhookDeadLetters } from "@/lib/webhook-dlq";
import { assertCronAuth } from "@/lib/cron-auth";

/**
 * Cron — retry outbound webhook DLQ
 * GET/POST /api/cron/webhook-dlq
 */
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  if (!assertCronAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await processWebhookDeadLetters(30);
    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    console.error("[cron/webhook-dlq]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
