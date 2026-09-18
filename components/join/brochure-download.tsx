"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function BrochureDownload() {
  const download = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("FE-Track — Jadi Field Engineer", 20, 25);
    doc.setFontSize(12);
    const lines = [
      "Kerja fleksibel perbaikan EDC / LAN / WAN di sekitar rumah.",
      "",
      "Benefit:",
      "• Fee 75.000 – 150.000 per job",
      "• Withdraw mingguan ke rekening",
      "• Training online gratis 1 jam",
      "• Sertifikat & jenjang karir ke SDWAN",
      "",
      "Syarat:",
      "• Motor + toolkit dasar + HP Android",
      "• Lulusan SMK TKJ / D3 / S1 TI (preferensi)",
      "",
      "Daftar: buka aplikasi → /join/register",
      "Atau scan QR dari koordinator daerahmu.",
      "",
      "© FE-Track Recruitment",
    ];
    let y = 40;
    for (const line of lines) {
      doc.text(line, 20, y);
      y += 8;
    }
    doc.save("FE-Track-Brosur-Rekrutmen.pdf");
  }, []);

  return (
    <Button onClick={() => void download()} className="bg-emerald-600 hover:bg-emerald-700">
      <Download className="mr-2 h-4 w-4" />
      Download Brosur PDF
    </Button>
  );
}
