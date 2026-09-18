import { formatPhase } from "@/lib/sla-phases";
import type { CustomerSlaReport } from "@/lib/reports";

/**
 * Generate PDF laporan SLA customer (client atau server via jsPDF).
 */
export async function downloadCustomerSlaPdf(report: CustomerSlaReport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  const line = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    if (opts?.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += (opts?.size ?? 10) + 6;
  };

  const ensureSpace = (need: number) => {
    if (y + need > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  line("FE-Track · Customer SLA Report", { bold: true, size: 16 });
  line(
    report.tenant
      ? `${report.tenant.name} (${report.tenant.code}) · ${report.tenant.city}`
      : report.city_filter
        ? `Kota: ${report.city_filter}`
        : "Semua tenant (filter aktif)",
    { size: 11 }
  );
  line(`Periode: ${report.period_label}`, { size: 10 });
  line(
    `Dibuat: ${new Date(report.generated_at).toLocaleString("id-ID")}`,
    { size: 9, color: [100, 100, 100] }
  );
  y += 8;

  line("Ringkasan SLA", { bold: true, size: 12 });
  line(
    `Total ticket: ${report.summary.total}  ·  Closed: ${report.summary.closed}  ·  Open: ${report.summary.open}`
  );
  line(
    `SLA Meet: ${report.summary.meet_pct}%  (${report.summary.meet} meet / ${report.summary.breach} breach)`,
    { bold: true }
  );
  y += 6;

  line("Rata-rata fase (sample closed/available)", { bold: true, size: 12 });
  line(`Response : ${formatPhase(report.phases.response_avg_ms)}`);
  line(`Travel   : ${formatPhase(report.phases.travel_avg_ms)}`);
  line(`On-site  : ${formatPhase(report.phases.onsite_avg_ms)}`);
  line(`Repair   : ${formatPhase(report.phases.repair_avg_ms)}`);
  line(`Pause    : ${formatPhase(report.phases.pause_avg_ms)}`);
  line(`Active   : ${formatPhase(report.phases.active_avg_ms)}`);
  y += 10;

  line("Detail ticket (maks. 80)", { bold: true, size: 12 });
  y += 2;

  // Header table
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const cols = [
    { x: margin, label: "Ticket" },
    { x: margin + 90, label: "Tenant" },
    { x: margin + 220, label: "Durasi" },
    { x: margin + 280, label: "Pause" },
    { x: margin + 340, label: "SLA" },
    { x: margin + 390, label: "Resp" },
    { x: margin + 440, label: "Travel" },
    { x: margin + 490, label: "Repair" },
  ];
  cols.forEach((c) => doc.text(c.label, c.x, y));
  y += 12;
  doc.setDrawColor(200);
  doc.line(margin, y - 8, pageW - margin, y - 8);

  doc.setFont("helvetica", "normal");
  for (const r of report.rows) {
    ensureSpace(16);
    doc.setFontSize(7.5);
    doc.text(r.ticket_no.slice(0, 16), margin, y);
    doc.text(r.tenant.slice(0, 22), margin + 90, y);
    doc.text(r.duration, margin + 220, y);
    doc.text(r.phase_pause, margin + 280, y);
    doc.text(r.sla_status, margin + 340, y);
    doc.text(r.phase_response, margin + 390, y);
    doc.text(r.phase_travel, margin + 440, y);
    doc.text(r.phase_repair, margin + 490, y);
    y += 11;
  }

  y += 16;
  ensureSpace(40);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "Dokumen ini dihasilkan otomatis oleh FE-Track untuk keperluan PIC customer.",
    margin,
    y
  );

  const name = report.tenant?.code ?? report.city_filter ?? "all";
  doc.save(
    `sla-report-${name}-${report.from || "all"}-${report.to || "all"}.pdf`
  );
}
