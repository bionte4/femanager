"use server";

import { requireAppAdmin } from "@/lib/rbac";
import {
  buildCustomerSlaReport,
  getPauseAuditRows,
  type ReportFilters,
} from "@/lib/reports";

async function requireAdmin() {
  return requireAppAdmin();
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
