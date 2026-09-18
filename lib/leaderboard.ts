import { Role, TicketStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LeaderboardPeriod = "today" | "week" | "month" | "all_time";

export function periodKey(period: LeaderboardPeriod, now = new Date()): string {
  if (period === "all_time") return "all_time";
  if (period === "today") {
    return now.toISOString().slice(0, 10);
  }
  if (period === "week") {
    const d = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    const week = Math.ceil(
      ((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
    );
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  // month
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function rangeForPeriod(period: LeaderboardPeriod, now = new Date()) {
  if (period === "all_time") return null;
  if (period === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === "week") {
    const from = new Date(now);
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - day + 1);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now };
}

/**
 * Score: (SLA meet * 0.4) + ((1000/avg_resolve) * 0.3) + (trust * 0.3) - fraud*10
 */
export function computeLeaderboardScore(params: {
  sla_meet_rate: number;
  avg_resolve_minutes: number;
  trust_score: number;
  fraud_count: number;
}): number {
  const resolvePart =
    params.avg_resolve_minutes > 0
      ? Math.min(100, 1000 / params.avg_resolve_minutes)
      : 0;
  const raw =
    params.sla_meet_rate * 0.4 +
    resolvePart * 0.3 +
    params.trust_score * 0.3 -
    params.fraud_count * 10;
  return Math.round(Math.max(0, raw) * 10) / 10;
}

export async function recalculateLeaderboard(
  period: LeaderboardPeriod = "month"
) {
  const key = periodKey(period);
  const range = rangeForPeriod(period);

  const engineers = await prisma.user.findMany({
    where: {
      role: Role.FIELD_ENGINEER,
      // Board earnings/kompetisi mitra — PKWT tidak masuk
      engagement_type: "MITRA",
    },
    select: {
      id: true,
      full_name: true,
      trust_score: true,
      is_suspended: true,
    },
  });

  const rows: {
    engineer_id: string;
    total_tickets: number;
    sla_meet_rate: number;
    avg_resolve_minutes: number;
    total_earnings: number;
    fraud_count: number;
    score: number;
  }[] = [];

  for (const eng of engineers) {
    const tickets = await prisma.ticket.findMany({
      where: {
        assigned_engineer_id: eng.id,
        status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        ...(range
          ? { resolved_at: { gte: range.from, lte: range.to } }
          : {}),
      },
      select: {
        created_at: true,
        resolved_at: true,
        sla_due_at: true,
        status: true,
        commission_amount: true,
        device: { select: { type: true, device_category: true } },
      },
    });

    const closed = tickets.filter((t) => t.resolved_at);
    // Bobot: 1 SDWAN = 3 poin, 1 EDC/lain = 1 poin
    const weightedTickets = closed.reduce((s, t) => {
      const sdwan =
        t.device?.device_category === "ROUTER_SDWAN" ||
        t.device?.type === "ROUTER_SDWAN";
      return s + (sdwan ? 3 : 1);
    }, 0);
    const total = closed.length;
    if (total === 0 && period !== "all_time") {
      // skip empty for period views except we still can store 0
    }

    const ontime = closed.filter(
      (t) =>
        !t.sla_due_at ||
        (t.resolved_at && t.resolved_at.getTime() <= t.sla_due_at.getTime())
    ).length;
    const slaMeet = total === 0 ? 100 : (ontime / total) * 100;

    const avgResolve =
      total === 0
        ? 0
        : closed.reduce(
            (s, t) =>
              s + (t.resolved_at!.getTime() - t.created_at.getTime()) / 60_000,
            0
          ) / total;

    const earnings = closed.reduce((s, t) => s + (t.commission_amount ?? 0), 0);

    const fraudCount = await prisma.fraudLog.count({
      where: {
        engineer_id: eng.id,
        ...(range ? { created_at: { gte: range.from, lte: range.to } } : {}),
      },
    });

    const score = computeLeaderboardScore({
      sla_meet_rate: slaMeet,
      avg_resolve_minutes: avgResolve || 999,
      trust_score: eng.trust_score,
      fraud_count: fraudCount,
    });
    // Bonus bobot SDWAN: +2 per ticket SDWAN (karena sudah dihitung 1 di total via formula biasa)
    const sdwanBonus = Math.max(0, weightedTickets - total) * 2;

    rows.push({
      engineer_id: eng.id,
      total_tickets: total,
      sla_meet_rate: Math.round(slaMeet * 10) / 10,
      avg_resolve_minutes: Math.round(avgResolve * 10) / 10,
      total_earnings: earnings,
      fraud_count: fraudCount,
      score: Math.round((score + sdwanBonus) * 10) / 10,
    });
  }

  rows.sort((a, b) => b.score - a.score || b.total_tickets - a.total_tickets);

  await prisma.$transaction(async (tx) => {
    await tx.leaderboardSnapshot.deleteMany({ where: { period: key } });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await tx.leaderboardSnapshot.create({
        data: {
          period: key,
          engineer_id: r.engineer_id,
          total_tickets: r.total_tickets,
          sla_meet_rate: r.sla_meet_rate,
          avg_resolve_minutes: r.avg_resolve_minutes,
          total_earnings: r.total_earnings,
          fraud_count: r.fraud_count,
          score: r.score,
          rank: i + 1,
        },
      });
    }
  });

  return { period: key, count: rows.length };
}

export async function getLeaderboard(
  period: LeaderboardPeriod,
  categoryCode?: string | null
) {
  const key = periodKey(period);
  let snapshots = await prisma.leaderboardSnapshot.findMany({
    where: { period: key },
    include: {
      engineer: {
        select: {
          id: true,
          full_name: true,
          city: true,
          trust_score: true,
          is_suspended: true,
          phone: true,
          skills: true,
          engagement_type: true,
        },
      },
    },
    orderBy: { rank: "asc" },
  });

  if (snapshots.length === 0) {
    await recalculateLeaderboard(period);
    snapshots = await prisma.leaderboardSnapshot.findMany({
      where: { period: key },
      include: {
        engineer: {
          select: {
            id: true,
            full_name: true,
            city: true,
            trust_score: true,
            is_suspended: true,
            phone: true,
            skills: true,
            engagement_type: true,
          },
        },
      },
      orderBy: { rank: "asc" },
    });
  }

  // Filter stale snapshot jika engineer sudah jadi PKWT
  const mitraOnly = snapshots.filter(
    (s) => s.engineer.engagement_type === "MITRA"
  );

  const filtered = categoryCode
    ? mitraOnly.filter((s) => s.engineer.skills.includes(categoryCode))
    : mitraOnly;

  return filtered.map((s, idx) => ({
    rank: categoryCode ? idx + 1 : s.rank,
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
    skills: s.engineer.skills,
  }));
}

// silence unused
void TransactionType;
