import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getCandidateMapPoints,
  getCandidates,
  getCoordinators,
  getCoverageGapsAction,
  getRecruitmentKpis,
} from "@/app/actions/recruitment";
import { RecruitmentClient } from "@/components/admin/recruitment-client";

export default async function AdminRecruitmentPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const [kpis, candidates, gaps, coordinators, mapPoints] = await Promise.all([
    getRecruitmentKpis(),
    getCandidates(),
    getCoverageGapsAction(),
    getCoordinators(),
    getCandidateMapPoints(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Resource Hunter</h1>
        <p className="text-xs text-muted-foreground">
          Rekrut, screening, dan onboarding FE freelance se-Indonesia.
        </p>
      </div>
      <RecruitmentClient
        kpis={kpis}
        candidates={candidates}
        gaps={gaps}
        coordinators={coordinators}
        mapPoints={mapPoints}
      />
    </div>
  );
}
