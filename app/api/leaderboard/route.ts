import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getLeaderboard,
  periodKey,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";

const VALID: LeaderboardPeriod[] = ["today", "week", "month", "all_time"];

/**
 * GET /api/leaderboard?period=month|2025-01|all_time|today|week
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const raw = req.nextUrl.searchParams.get("period") ?? "month";

    let period: LeaderboardPeriod = "month";
    if (VALID.includes(raw as LeaderboardPeriod)) {
      period = raw as LeaderboardPeriod;
    } else if (raw === "all_time") {
      period = "all_time";
    } else if (/^\d{4}-\d{2}$/.test(raw)) {
      // YYYY-MM → treat as month period key via recalculate month if matches current
      period = "month";
      const currentKey = periodKey("month");
      if (raw !== currentKey) {
        // Return snapshots for that exact period key without recalculate
        const { prisma } = await import("@/lib/prisma");
        const snapshots = await prisma.leaderboardSnapshot.findMany({
          where: { period: raw },
          include: {
            engineer: {
              select: {
                id: true,
                full_name: true,
                city: true,
                trust_score: true,
                is_suspended: true,
                engagement_type: true,
              },
            },
          },
          orderBy: { rank: "asc" },
        });
        const mitra = snapshots.filter(
          (s) => s.engineer.engagement_type === "MITRA"
        );
        return NextResponse.json({
          success: true,
          period: raw,
          data: mitra.map((s, idx) => ({
            rank: idx + 1,
            engineer_id: s.engineer_id,
            full_name: s.engineer.full_name,
            city: s.engineer.city,
            trust_score: s.engineer.trust_score,
            is_suspended: s.engineer.is_suspended,
            total_tickets: s.total_tickets,
            sla_meet_rate: s.sla_meet_rate,
            avg_resolve_minutes: s.avg_resolve_minutes,
            total_earnings: s.total_earnings,
            fraud_count: s.fraud_count,
            score: s.score,
            period: s.period,
          })),
        });
      }
    }

    const data = await getLeaderboard(period);
    return NextResponse.json({ success: true, period: periodKey(period), data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Gagal load leaderboard" },
      { status: 500 }
    );
  }
}
