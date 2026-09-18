import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLeaderboard } from "@/lib/leaderboard";
import { isPkwtEngagement } from "@/lib/eligibility";
import { EngineerLeaderboardClient } from "@/components/engineer/leaderboard-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EngineerLeaderboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "FIELD_ENGINEER") {
    redirect("/login");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { engagement_type: true },
  });

  if (me && isPkwtEngagement(me.engagement_type)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Papan peringkat komisi khusus Mitra.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Akun PKWT tidak masuk ranking earnings mitra. Performa lapangan tetap
          tercatat di ticket & SLA untuk laporan HR.
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/engineer/my-tickets">Kembali ke ticket</Link>
        </Button>
      </div>
    );
  }

  const rows = await getLeaderboard("month");
  const myRank = rows.find((r) => r.engineer_id === session.user.id) ?? null;
  const top10 = rows.slice(0, 10);

  return (
    <div className="space-y-4">
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
