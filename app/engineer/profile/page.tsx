import Link from "next/link";
import { redirect } from "next/navigation";
import { PartnershipStatus } from "@prisma/client";
import { signOut } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="text-lg font-semibold">
            {session.user.role.replaceAll("_", " ")}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-muted-foreground">Kemitraan</p>
        {me?.partnership_status === PartnershipStatus.SIGNED && signed ? (
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
