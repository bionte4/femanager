import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { getCandidateById } from "@/app/actions/recruitment";
import { CandidateDetailClient } from "@/components/admin/candidate-detail-client";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function CandidateDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);
  const candidate = await getCandidateById(id);
  if (!candidate) notFound();

  return (
    <div className="space-y-3">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/recruitment">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {candidate.full_name}
        </h1>
        <p className="text-xs text-muted-foreground">
          Detail kandidat · score {candidate.screening_score ?? "—"}
        </p>
      </div>
      <CandidateDetailClient candidate={candidate} />
    </div>
  );
}
