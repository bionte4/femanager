import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findActiveContract } from "@/lib/eligibility";
import {
  engagementLabel,
  employmentLabel,
  isMitraEngagement,
  isPkwtEngagement,
} from "@/lib/eligibility";
import { DownloadAgreementPdfButton } from "@/components/engineer/download-agreement-pdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function EngineerProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      is_coordinator: true,
      partnership_status: true,
      engagement_type: true,
      employment_status: true,
      employer_name: true,
      employee_no: true,
      tools_owned: true,
      can_work_for_others: true,
      has_motorcycle: true,
      has_toolkit: true,
      has_car: true,
      agreements: {
        where: { status: "SIGNED" },
        orderBy: { signed_at: "desc" },
        take: 1,
        include: { agreement: true },
      },
    },
  });

  const engagement = me?.engagement_type ?? "MITRA";
  const isMitra = isMitraEngagement(engagement);
  const isPkwt = isPkwtEngagement(engagement);
  const activeContract = isPkwt
    ? await findActiveContract(session.user.id)
    : null;

  const signed = me?.agreements[0] ?? null;
  const tools = Array.isArray(me?.tools_owned)
    ? (me!.tools_owned as string[])
    : [
        me?.has_motorcycle ? "motorcycle" : null,
        me?.has_toolkit ? "toolkit" : null,
        me?.has_car ? "car" : null,
      ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
        <p className="text-base text-muted-foreground">Data akun kamu</p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Nama</p>
          <p className="text-lg font-semibold">{session.user.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Nomor HP</p>
          <p className="text-lg font-semibold">{session.user.phone}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tipe engagement</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={isPkwt ? "secondary" : "success"}>
              {engagementLabel(engagement)}
            </Badge>
            {isPkwt && (
              <Badge variant="outline">
                Kepegawaian: {employmentLabel(me?.employment_status ?? "NONE")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isMitra && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Kemitraan</p>
          {me?.partnership_status === "SIGNED" && signed ? (
            <>
              <Badge variant="success">Mitra Aktif</Badge>
              <p className="text-sm">
                Status: Mitra Aktif — Perjanjian {signed.agreement.version}{" "}
                ditandatangani{" "}
                {signed.signed_at
                  ? new Date(signed.signed_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Boleh kerja di tempat lain:{" "}
                {me.can_work_for_others ? "Ya" : "Tidak"}
              </p>
              <p className="text-xs text-muted-foreground">
                Alat milik sendiri: {tools.length ? tools.join(", ") : "—"}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link href="/engineer/agreement?view=1">Lihat Perjanjian</Link>
                </Button>
                <DownloadAgreementPdfButton
                  title={signed.agreement.title}
                  version={signed.agreement.version}
                  engineerName={session.user.name ?? ""}
                  contentHtml={signed.agreement.content_html}
                  signatureData={signed.signature_data}
                  signedAt={signed.signed_at?.toISOString() ?? null}
                  consentText={signed.consent_text}
                />
              </div>
            </>
          ) : (
            <>
              <Badge variant="warning">Belum Signed</Badge>
              <Button asChild size="lg" className="mt-2 w-full">
                <Link href="/engineer/agreement">Tanda Tangani Sekarang</Link>
              </Button>
            </>
          )}
        </div>
      )}

      {isPkwt && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Kontrak kerja
          </p>
          {me?.employer_name && (
            <p className="text-sm">
              Employer: <span className="font-medium">{me.employer_name}</span>
            </p>
          )}
          {me?.employee_no && (
            <p className="text-xs text-muted-foreground">
              No. karyawan: {me.employee_no}
            </p>
          )}
          {activeContract ? (
            <>
              <Badge variant="success">Kontrak aktif</Badge>
              <p className="text-sm">
                {activeContract.client_label
                  ? `Penempatan: ${activeContract.client_label}`
                  : "Penempatan umum"}
              </p>
              <p className="text-xs text-muted-foreground">
                Berlaku{" "}
                {new Date(activeContract.start_at).toLocaleDateString("id-ID")}{" "}
                – {new Date(activeContract.end_at).toLocaleDateString("id-ID")}
              </p>
              {activeContract.placement_cities.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Kota: {activeContract.placement_cities.join(", ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Kompensasi lewat payroll HR — bukan komisi wallet mitra.
              </p>
            </>
          ) : (
            <>
              <Badge variant="warning">Belum ada kontrak aktif</Badge>
              <p className="text-sm text-muted-foreground">
                Hubungi admin/HR untuk aktivasi kontrak PKWT.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/engineer/employment-blocked">Lihat status akses</Link>
              </Button>
            </>
          )}
        </div>
      )}

      {me?.is_coordinator && (
        <Button asChild size="lg" className="w-full" variant="outline">
          <Link href="/coordinator/recruits">Panel Koordinator / Recruits</Link>
        </Button>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="destructive" size="lg" className="w-full">
          Keluar
        </Button>
      </form>
    </div>
  );
}
