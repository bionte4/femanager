import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEngineerCertifications } from "@/app/actions/sdwan";
import { CertificationsClient } from "@/components/admin/certifications-client";
import { Button } from "@/components/ui/button";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EngineerCertificationsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);
  const engineer = await prisma.user.findUnique({
    where: { id },
    select: { id: true, full_name: true },
  });
  if (!engineer) notFound();

  const certs = await getEngineerCertifications(id);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/admin/engineers/${id}`}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke profil
        </Link>
      </Button>
      <CertificationsClient
        engineerId={engineer.id}
        engineerName={engineer.full_name}
        certs={certs}
      />
    </div>
  );
}
