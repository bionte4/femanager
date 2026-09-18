import { NextResponse } from "next/server";
import { CandidateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";
import { assertCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/remind-candidates
 * Reminder admin untuk kandidat SCREENING/NEW > 2 hari
 * Header: Authorization: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
  if (!assertCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const stale = await prisma.engineerCandidate.findMany({
    where: {
      status: { in: [CandidateStatus.NEW, CandidateStatus.SCREENING] },
      created_at: { lte: cutoff },
    },
    take: 50,
    orderBy: { created_at: "asc" },
  });

  const adminPhone = process.env.ADMIN_WHATSAPP || process.env.ADMIN_PHONE;
  if (adminPhone && stale.length > 0) {
    const names = stale
      .slice(0, 10)
      .map((c) => `${c.full_name} (${c.city})`)
      .join(", ");
    await sendWhatsApp({
      phone: adminPhone,
      message: `Reminder recruitment: ${stale.length} kandidat menunggu screening >2 hari. Contoh: ${names}. Cek /admin/recruitment`,
    });
  }

  return NextResponse.json({
    success: true,
    reminded: stale.length,
  });
}
