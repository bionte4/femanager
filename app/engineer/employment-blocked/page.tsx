import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  eligibleForWork,
  eligibilityMessage,
  engagementLabel,
  employmentLabel,
} from "@/lib/eligibility";
import { HardRedirect } from "@/components/engineer/hard-redirect";
import { EngineerLogoutButton } from "@/components/engineer/logout-button";
import { Badge } from "@/components/ui/badge";

export default async function EmploymentBlockedPage() {
  const session = await auth();
  if (!session?.user) {
    return <HardRedirect href="/login" />;
  }

  const elig = await eligibleForWork(session.user.id);
  if (elig.ok) {
    return <HardRedirect href="/engineer/my-tickets" />;
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      engagement_type: true,
      employment_status: true,
      employer_name: true,
    },
  });

  return (
    <div className="flex flex-col gap-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Akses lapangan ditunda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {eligibilityMessage(elig.reason)}
        </p>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {engagementLabel(me?.engagement_type ?? "PKWT_OUTTASK")}
          </Badge>
          <Badge variant="outline">
            {employmentLabel(me?.employment_status ?? "NONE")}
          </Badge>
        </div>
        {me?.employer_name && (
          <p className="text-muted-foreground">
            Employer: <span className="text-foreground">{me.employer_name}</span>
          </p>
        )}
        <p className="text-muted-foreground leading-relaxed">
          Karyawan PKWT tidak menandatangani perjanjian kemitraan. Admin/HR
          harus membuat &amp; mengaktifkan kontrak di menu{" "}
          <span className="font-medium text-foreground">Kontrak PKWT</span>.
        </p>
      </div>

      <EngineerLogoutButton
        label="Keluar / ganti akun"
        variant="outline"
        className="h-11 w-full"
      />
    </div>
  );
}
