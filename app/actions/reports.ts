"use server";

import { auth, ADMIN_ROLES } from "@/lib/auth";
import {
  buildCustomerSlaReport,
  getPauseAuditRows,
  type ReportFilters,
} from "@/lib/reports";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function fetchPauseAuditAction(params?: {
  from?: string;
  to?: string;
  min_pause_minutes?: number;
}) {
  await requireAdmin();
  return getPauseAuditRows({
    from: params?.from,
    to: params?.to,
    min_pause_ms: params?.min_pause_minutes
      ? params.min_pause_minutes * 60_000
      : undefined,
  });
}

export async function fetchCustomerSlaReportAction(filters: ReportFilters) {
  await requireAdmin();
  return buildCustomerSlaReport(filters);
}
