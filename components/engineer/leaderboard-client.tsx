"use client";

import { formatRupiah } from "@/lib/utils/rupiah";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardRow } from "@/components/admin/leaderboard-client";

export function EngineerLeaderboardClient({
  myRank,
  top10,
  periodLabel,
}: {
  myRank: LeaderboardRow | null;
  top10: LeaderboardRow[];
  periodLabel: string;
}) {
  const nextTarget = myRank
    ? top10.find((r) => r.rank === myRank.rank - 1)
    : null;
  const ticketsToClimb =
    myRank && nextTarget
      ? Math.max(1, nextTarget.total_tickets - myRank.total_tickets + 1)
      : 2;

  return (
    <div className="space-y-4 pb-24">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {myRank
              ? `Kamu Ranking #${myRank.rank} ${periodLabel}!`
              : `Belum masuk ranking ${periodLabel}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {myRank ? (
            <>
              <p>
                Score <strong>{myRank.score}</strong> · SLA{" "}
                {myRank.sla_meet_rate}% · Trust {myRank.trust_score}
              </p>
              <p>
                Earnings: {formatRupiah(myRank.total_earnings)} ·{" "}
                {myRank.total_tickets} ticket
              </p>
              {myRank.rank > 1 && (
                <p className="rounded-lg bg-background p-3 text-muted-foreground">
                  Selesaikan {ticketsToClimb} ticket ontime lagi untuk naik ke
                  Rank #{myRank.rank - 1}
                  {nextTarget ? ` (kejar ${nextTarget.full_name})` : ""} dan
                  dapat bonus extra Rp 50.000
                </p>
              )}
              {myRank.rank === 1 && (
                <p className="rounded-lg bg-background p-3 font-medium">
                  Kamu #1! Pertahankan SLA meet biar tetap di puncak.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Resolve ticket ontime untuk masuk leaderboard bulan ini.
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-base font-semibold">Top 10 {periodLabel}</h2>
        <ul className="divide-y rounded-xl border bg-card">
          {top10.map((r) => {
            const isMe = myRank?.engineer_id === r.engineer_id;
            return (
              <li
                key={r.engineer_id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  isMe ? "bg-primary/10" : ""
                }`}
              >
                <span className="w-10 shrink-0 text-lg font-bold">
                  {r.rank === 1 ? "👑" : `#${r.rank}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.full_name}
                    {isMe ? " (kamu)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.total_tickets} ticket · SLA {r.sla_meet_rate}% · score{" "}
                    {r.score}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium">
                  {formatRupiah(r.total_earnings)}
                </span>
              </li>
            );
          })}
          {top10.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada data ranking
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
