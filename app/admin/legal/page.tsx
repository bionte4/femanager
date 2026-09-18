import { auth, ADMIN_ROLES } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getComplianceDashboard,
  listEngineerAgreements,
  listPartnershipAgreements,
} from "@/app/actions/legal";
import { LegalComplianceClient } from "@/components/admin/legal-compliance-client";

export default async function AdminLegalPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const [templates, agreements, compliance] = await Promise.all([
    listPartnershipAgreements(),
    listEngineerAgreements(),
    getComplianceDashboard(),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Legal &amp; Compliance
        </h1>
        <p className="text-xs text-muted-foreground">
          Perjanjian kemitraan, e-sign mitra, dan bukti kepatuhan (bebas
          menolak job).
        </p>
      </div>
      <LegalComplianceClient
        templates={templates.map((t) => ({
          ...t,
          created_at: t.created_at.toISOString(),
        }))}
        agreements={agreements.map((a) => ({
          ...a,
          signed_at: a.signed_at?.toISOString() ?? null,
        }))}
        compliance={compliance}
      />
    </div>
  );
}
