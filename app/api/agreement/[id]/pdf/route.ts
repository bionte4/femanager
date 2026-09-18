import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/agreement/[id]/pdf
 * id = EngineerAgreement id
 * Generate PDF client-compatible via jsPDF di server.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await Promise.resolve(ctx.params);
    const ea = await prisma.engineerAgreement.findUnique({
      where: { id },
      include: {
        engineer: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            city: true,
          },
        },
        agreement: true,
      },
    });

    if (!ea) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(
      session.user.role
    );
    if (!isAdmin && ea.engineer_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    const maxWidth = 500;

    doc.setFontSize(14);
    doc.text(ea.agreement.title, margin, y, { maxWidth });
    y += 24;
    doc.setFontSize(10);
    doc.text(`Versi: ${ea.agreement.version}`, margin, y);
    y += 16;
    doc.text(
      `Mitra: ${ea.engineer.full_name} · ${ea.engineer.phone}`,
      margin,
      y
    );
    y += 14;
    doc.text(
      `Nomor: PKM/${ea.engineer.id.slice(-8).toUpperCase()}/${new Date().getFullYear()}`,
      margin,
      y
    );
    y += 14;
    doc.text(`Status: ${ea.status}`, margin, y);
    y += 14;
    if (ea.signed_at) {
      doc.text(
        `Ditandatangani: ${ea.signed_at.toLocaleString("id-ID")}`,
        margin,
        y
      );
      y += 14;
    }
    if (ea.ip_address) {
      doc.text(`IP: ${ea.ip_address}`, margin, y);
      y += 20;
    } else {
      y += 8;
    }

    // Strip HTML sederhana untuk body
    const plain = ea.agreement.content_html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/\{\{ENGINEER_ID\}\}/g, ea.engineer.id.slice(-8).toUpperCase())
      .replace(/\{\{YEAR\}\}/g, String(new Date().getFullYear()))
      .trim();

    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plain, maxWidth);
    for (const line of lines) {
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 12;
    }

    y += 16;
    if (y > 680) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(9);
    doc.text("Consent:", margin, y);
    y += 12;
    const consentLines = doc.splitTextToSize(ea.consent_text, maxWidth);
    doc.text(consentLines, margin, y);
    y += consentLines.length * 12 + 16;

    if (ea.signature_data?.startsWith("data:image")) {
      try {
        if (y > 650) {
          doc.addPage();
          y = margin;
        }
        doc.text("Tanda tangan:", margin, y);
        y += 8;
        doc.addImage(ea.signature_data, "PNG", margin, y, 200, 64);
      } catch {
        // ignore image errors
      }
    }

    const buf = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="agreement-${ea.id.slice(-8)}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF error" },
      { status: 500 }
    );
  }
}
