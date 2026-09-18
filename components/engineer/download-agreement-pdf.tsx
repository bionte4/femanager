"use client";

import { useRef } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";

/** Download PDF perjanjian dari HTML + signature (client-side) */
export function DownloadAgreementPdfButton({
  title,
  version,
  engineerName,
  contentHtml,
  signatureData,
  signedAt,
  consentText,
}: {
  title: string;
  version: string;
  engineerName: string;
  contentHtml: string;
  signatureData?: string | null;
  signedAt?: string | null;
  consentText: string;
}) {
  const busy = useRef(false);

  function download() {
    if (busy.current) return;
    busy.current = true;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      let y = margin;
      doc.setFontSize(14);
      doc.text(title, margin, y, { maxWidth: 500 });
      y += 22;
      doc.setFontSize(10);
      doc.text(`Versi: ${version} · Mitra: ${engineerName}`, margin, y);
      y += 14;
      if (signedAt) {
        doc.text(
          `Ditandatangani: ${new Date(signedAt).toLocaleString("id-ID")}`,
          margin,
          y
        );
        y += 18;
      }
      const plain = contentHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(plain, 500);
      for (const line of lines) {
        if (y > 750) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 12;
      }
      y += 12;
      doc.text(doc.splitTextToSize(consentText, 500), margin, y);
      y += 40;
      if (signatureData?.startsWith("data:image")) {
        try {
          doc.addImage(signatureData, "PNG", margin, y, 180, 60);
        } catch {
          /* ignore */
        }
      }
      doc.save(`perjanjian-${version.replace(/\s+/g, "-")}.pdf`);
    } finally {
      busy.current = false;
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={download}>
      Download PDF
    </Button>
  );
}
