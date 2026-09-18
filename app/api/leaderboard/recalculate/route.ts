import { NextRequest, NextResponse } from "next/server";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import {
  recalculateLeaderboard,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";

const VALID: LeaderboardPeriod[] = ["today", "week", "month", "all_time"];

/**
 * POST /api/leaderboard/recalculate
 * Body: { period?: "today"|"week"|"month"|"all_time" }
 * Default: hitung month + all_time
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { period?: string };
    if (body.period && VALID.includes(body.period as LeaderboardPeriod)) {
      const result = await recalculateLeaderboard(body.period as LeaderboardPeriod);
      return NextResponse.json({ success: true, ...result });
    }

    const month = await recalculateLeaderboard("month");
    const all = await recalculateLeaderboard("all_time");
    return NextResponse.json({
      success: true,
      period: `${month.period}+${all.period}`,
      count: month.count,
      results: [month, all],
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Recalculate gagal" },
      { status: 500 }
    );
  }
}
