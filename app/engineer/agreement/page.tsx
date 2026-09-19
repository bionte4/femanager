import Link from "next/link";
import { PartnershipStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveAgreementForEngineer } from "@/app/actions/legal";
import { AgreementSignForm } from "@/components/engineer/agreement-sign-form";
import { DownloadAgreementPdfButton } from "@/components/engineer/download-agreement-pdf";
import { HardRedirect } from "@/components/engineer/hard-redirect";
import { Button } from "@/components/ui/button";
import { EngineerLogoutButton } from "@/components/engineer/logout-button";

/** Selalu dinamis — hindari cache RSC yang bikin blank/stale setelah login FE baru */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toolsFromUser(user: {
  tools_owned: unknown;
  has_motorcycle: boolean;
  has_toolkit: boolean;
  has_car: boolean;
}): string[] {
  if (Array.isArray(user.tools_owned)) {
    return user.tools_owned.map(String);
  }
  const tools: string[] = [];
  if (user.has_motorcycle) tools.push("motorcycle");
  if (user.has_toolkit) tools.push("toolkit");
  if (user.has_car) tools.push("car");
  return tools;
}

type PageProps = {
  searchParams?: Promise<{ view?: string }> | { view?: string };
};

export default async function EngineerAgreementPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await Promise.resolve(searchParams ?? {});
  const viewOnly = sp.view === "1";

  let data: Awaited<ReturnType<typeof getActiveAgreementForEngineer>>;
  try {
    data = await getActiveAgreementForEngineer(session.user.id);
  } catch (e) {
    console.error("[agreement] getActiveAgreementForEngineer", e);
    return (
      <div className="space-y-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Perjanjian Kemitraan
        </h1>
        <p className="text-sm text-muted-foreground">
          Gagal memuat template perjanjian. Coba muat ulang atau hubungi admin.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="default" className="w-full">
            <Link href="/engineer/agreement">Muat ulang</Link>
          </Button>
          <EngineerLogoutButton
            label="Keluar / ganti akun"
            variant="outline"
            className="w-full"
          />
        </div>
      </div>
    );
  }

  if (!data) redirect("/login");

  // PKWT tidak pakai agreement — arahkan ke gate employment
  if (data.user.engagement_type !== "MITRA") {
    return <HardRedirect href="/engineer/employment-blocked" />;
  }

  const userSigned = data.user.partnership_status === PartnershipStatus.SIGNED;

  // Sudah mitra aktif → hard redirect (soft RSC redirect sering nyangkut blank di FE)
  if (userSigned && !viewOnly) {
    return <HardRedirect href="/engineer/my-tickets" />;
  }

  if (!data.agreement) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Perjanjian Kemitraan</h1>
        <p className="text-sm text-muted-foreground">
          Belum ada template perjanjian aktif. Hubungi admin.
        </p>
        <EngineerLogoutButton
          label="Keluar / ganti akun"
          variant="outline"
          className="w-full"
        />
      </div>
    );
  }

  const year = new Date().getFullYear();
  const html = data.agreement.content_html
    .replaceAll("{{ENGINEER_ID}}", data.user.id.slice(-8).toUpperCase())
    .replaceAll("{{YEAR}}", String(year));

  if (
    userSigned &&
    viewOnly &&
    data.engineerAgreement?.status === "SIGNED"
  ) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/engineer/profile">← Kembali</Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          Perjanjian Kemitraan (Read-only)
        </h1>
        <div
          className="prose prose-sm max-w-none rounded-xl border bg-card p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {data.engineerAgreement.signature_data && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.engineerAgreement.signature_data}
            alt="Tanda tangan"
            className="h-24 rounded border bg-white"
          />
        )}
        <DownloadAgreementPdfButton
          title={data.agreement.title}
          version={data.agreement.version}
          engineerName={data.user.full_name}
          contentHtml={html}
          signatureData={data.engineerAgreement.signature_data}
          signedAt={data.engineerAgreement.signed_at?.toISOString() ?? null}
          consentText={data.engineerAgreement.consent_text}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Perjanjian Kemitraan
        </h1>
        <p className="text-sm text-muted-foreground">
          Wajib ditandatangani sebelum mengambil job. Ini kemitraan, bukan
          hubungan kerja.
        </p>
      </div>
      <AgreementSignForm
        contentHtml={html}
        engineerName={data.user.full_name}
        engineerPhone={data.user.phone}
        toolsOwned={toolsFromUser(data.user)}
        version={data.agreement.version}
      />
    </div>
  );
}
