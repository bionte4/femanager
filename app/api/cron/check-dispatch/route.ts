import { NextRequest, NextResponse } from "next/server";
import { processDispatchTimeouts } from "@/lib/dispatch";
import { assertCronAuth } from "@/lib/cron-auth";

/**
 * Cron job — hit tiap 1 menit
 * GET/POST /api/cron/check-dispatch
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  return runCron(req);
}

export async function POST(req: NextRequest) {
  return runCron(req);
}

async function runCron(req: NextRequest) {
  if (!assertCronAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await processDispatchTimeouts();
    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    console.error("[cron/check-dispatch]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
