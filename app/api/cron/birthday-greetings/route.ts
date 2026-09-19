import { NextRequest, NextResponse } from "next/server";
import { assertCronAuth } from "@/lib/cron-auth";
import { sendBirthdayGreetings } from "@/lib/birthday-greetings";

/**
 * Cron harian — ucapan ulang tahun Mitra/PKWT via WA + Telegram
 * GET/POST /api/cron/birthday-greetings
 * Header: Authorization: Bearer <CRON_SECRET>
 * Jadwal disarankan: 08:00 WIB
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
    const result = await sendBirthdayGreetings();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (e) {
    console.error("[cron/birthday-greetings]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
