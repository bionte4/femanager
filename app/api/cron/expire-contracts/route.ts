import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { expireEngineerContracts } from "@/lib/contracts";

/**
 * Cron harian — expire kontrak PKWT yang lewat end_at
 * GET/POST /api/cron/expire-contracts
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
    const result = await expireEngineerContracts();
    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    console.error("[cron/expire-contracts]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
