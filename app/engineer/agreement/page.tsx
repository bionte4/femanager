import Link from "next/link";
import { redirect } from "next/navigation";
import { PartnershipStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getActiveAgreementForEngineer } from "@/app/actions/legal";
import { AgreementSignForm } from "@/components/engineer/agreement-sign-form";
import { DownloadAgreementPdfButton } from "@/components/engineer/download-agreement-pdf";
import { Button } from "@/components/ui/button";

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

  const data = await getActiveAgreementForEngineer(session.user.id);
  if (!data) redirect("/login");

  const alreadySigned =
    data.user.partnership_status === PartnershipStatus.SIGNED &&
    data.engineerAgreement?.status === "SIGNED";

  if (alreadySigned && !viewOnly) {
    // Default: signed users going to /agreement without ?view=1 → tickets
    // Profile pakai ?view=1 untuk baca ulang
    redirect("/engineer/my-tickets");
  }

  if (!data.agreement) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Perjanjian Kemitraan</h1>
        <p className="text-muted-foreground">
          Belum ada template perjanjian aktif. Hubungi admin.
        </p>
      </div>
    );
  }

  const year = new Date().getFullYear();
  const html = data.agreement.content_html
    .replaceAll("{{ENGINEER_ID}}", data.user.id.slice(-8).toUpperCase())
    .replaceAll("{{YEAR}}", String(year));

  if (alreadySigned && viewOnly && data.engineerAgreement) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/engineer/profile">← Kembali</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
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
        <h1 className="text-2xl font-bold tracking-tight">
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
