import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { remindExpiringContracts } from "@/lib/contracts";

/**
 * Cron harian — WA reminder kontrak PKWT sisa 30/14/7/3 hari
 * GET/POST /api/cron/remind-contracts
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
    const result = await remindExpiringContracts();
    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    console.error("[cron/remind-contracts]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
