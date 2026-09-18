import { auth } from "@/lib/auth";
import { eligibleForWork, eligibilityMessage } from "@/lib/eligibility";
import { HardRedirect } from "@/components/engineer/hard-redirect";
import { EngineerLogoutButton } from "@/components/engineer/logout-button";

export default async function EmploymentBlockedPage() {
  const session = await auth();
  if (!session?.user) {
    return <HardRedirect href="/login" />;
  }

  const elig = await eligibleForWork(session.user.id);
  if (elig.ok) {
    return <HardRedirect href="/engineer/my-tickets" />;
  }

  return (
    <div className="flex flex-col gap-4 py-8">
      <h1 className="text-xl font-semibold">Akses lapangan ditunda</h1>
      <p className="text-sm text-muted-foreground">
        {eligibilityMessage(elig.reason)}
      </p>
      <p className="text-sm text-muted-foreground">
        Akun PKWT membutuhkan kontrak aktif dari admin/HR. Buka menu{" "}
        <span className="font-medium">Kontrak PKWT</span> di admin untuk
        aktivasi.
      </p>
      <EngineerLogoutButton
        label="Keluar / ganti akun"
        variant="outline"
        className="h-11 w-full"
      />
    </div>
  );
}
