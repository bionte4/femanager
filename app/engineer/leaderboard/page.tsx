import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getLeaderboard } from "@/lib/leaderboard";
import { EngineerLeaderboardClient } from "@/components/engineer/leaderboard-client";

export default async function EngineerLeaderboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.FIELD_ENGINEER) {
    redirect("/login");
  }

  const rows = await getLeaderboard("month");
  const myRank = rows.find((r) => r.engineer_id === session.user.id) ?? null;
  const top10 = rows.slice(0, 10);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Kompetisi jujur — fraud menurunkan ranking &amp; trust score.
        </p>
      </div>
      <EngineerLeaderboardClient
        myRank={myRank}
        top10={top10}
        periodLabel="Bulan Ini"
      />
    </div>
  );
}
