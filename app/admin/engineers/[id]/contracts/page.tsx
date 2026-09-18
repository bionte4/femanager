import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { auth, CONTRACT_ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listEngineerContracts,
  listEngagementChangeLogs,
} from "@/app/actions/contracts";
import { EngineerContractsClient } from "@/components/admin/engineer-contracts-client";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EngineerContractsPage({ params }: PageProps) {
  const session = await auth();
  if (
    !session?.user ||
    !(CONTRACT_ADMIN_ROLES as readonly string[]).includes(session.user.role)
  ) {
    redirect("/admin/engineers");
  }

  const { id } = await Promise.resolve(params);
  const engineer = await prisma.user.findFirst({
    where: { id, role: Role.FIELD_ENGINEER },
    select: {
      id: true,
      full_name: true,
      engagement_type: true,
      employment_status: true,
    },
  });
  if (!engineer) notFound();

  const [contracts, changeLogs] = await Promise.all([
    listEngineerContracts(id),
    listEngagementChangeLogs(id),
  ]);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/admin/engineers/${id}`}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke profil
        </Link>
      </Button>
      <EngineerContractsClient
        engineerId={engineer.id}
        engineerName={engineer.full_name}
        engagementType={engineer.engagement_type}
        employmentStatus={engineer.employment_status}
        isSuperAdmin={session.user.role === Role.SUPER_ADMIN}
        contracts={contracts}
        changeLogs={changeLogs}
      />
    </div>
  );
}
