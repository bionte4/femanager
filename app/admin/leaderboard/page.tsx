import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getLeaderboard,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";
import { SERVICE_CATEGORY_CODES } from "@/lib/service-categories";
import { LeaderboardClient } from "@/components/admin/leaderboard-client";

type PageProps = {
  searchParams?:
    | Promise<{ period?: string; category?: string }>
    | { period?: string; category?: string };
};

const VALID: LeaderboardPeriod[] = ["today", "week", "month", "all_time"];

export default async function AdminLeaderboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const sp = await Promise.resolve(searchParams ?? {});
  const period = (
    VALID.includes(sp.period as LeaderboardPeriod)
      ? sp.period
      : "month"
  ) as LeaderboardPeriod;

  const category =
    sp.category &&
    (SERVICE_CATEGORY_CODES as readonly string[]).includes(sp.category)
      ? sp.category
      : null;

  const rows = await getLeaderboard(period, category);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-xs text-muted-foreground">
          Ranking engineer berdasarkan SLA, kecepatan, trust, dan fraud.
          {category ? ` Filter: Top FE ${category}` : ""}
        </p>
      </div>
      <LeaderboardClient
        initialPeriod={period}
        initialCategory={category}
        rows={rows}
      />
    </div>
  );
}
