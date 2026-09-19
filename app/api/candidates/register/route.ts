import { NextRequest, NextResponse } from "next/server";
import { CandidateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { candidateRegisterSchema } from "@/lib/validations/candidates";
import { calculateScreeningScore } from "@/lib/candidateScoring";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/candidates/register — public, max 5/hour per IP
 */
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = checkRateLimit(`cand-reg:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: "Batas pendaftaran tercapai (5/jam). Coba lagi nanti." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = candidateRegisterSchema.parse(body);

    const existing = await prisma.engineerCandidate.findUnique({
      where: { phone: parsed.phone },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Nomor HP sudah terdaftar sebagai kandidat" },
        { status: 409 }
      );
    }

    const userExists = await prisma.user.findUnique({
      where: { phone: parsed.phone },
    });
    if (userExists) {
      return NextResponse.json(
        { success: false, error: "Nomor HP sudah punya akun FE-Track" },
        { status: 409 }
      );
    }

    let coordinatorId: string | null = null;
    if (parsed.assigned_coordinator_id) {
      const coord = await prisma.user.findFirst({
        where: {
          id: parsed.assigned_coordinator_id,
          is_coordinator: true,
        },
      });
      if (coord) coordinatorId = coord.id;
    }

    const autoScore = await calculateScreeningScore({
      has_motorcycle: parsed.has_motorcycle,
      has_toolkit: parsed.has_toolkit,
      education: parsed.education,
      experience_years: parsed.experience_years,
      skills: parsed.skills,
      previous_vendor: parsed.previous_vendor || null,
      city: parsed.city,
    });

    const emptyToNull = (v: string | null | undefined) =>
      !v || v.trim() === "" ? null : v;

    const candidate = await prisma.engineerCandidate.create({
      data: {
        full_name: parsed.full_name.trim(),
        phone: parsed.phone.trim(),
        whatsapp: parsed.whatsapp.trim(),
        email: emptyToNull(parsed.email),
        nik: emptyToNull(parsed.nik),
        address: parsed.address.trim(),
        province: parsed.province.trim(),
        city: parsed.city.trim(),
        district: parsed.district.trim(),
        lat: parsed.lat ?? null,
        lng: parsed.lng ?? null,
        education: parsed.education,
        school_name: emptyToNull(parsed.school_name),
        has_motorcycle: parsed.has_motorcycle,
        has_toolkit: parsed.has_toolkit,
        has_laptop: parsed.has_laptop,
        has_car: parsed.has_car ?? false,
        has_ladder: parsed.has_ladder ?? false,
        has_drill: parsed.has_drill ?? false,
        skills: parsed.skills,
        experience_years: parsed.experience_years,
        previous_vendor: emptyToNull(parsed.previous_vendor),
        bank_name: emptyToNull(parsed.bank_name),
        bank_account_no: emptyToNull(parsed.bank_account_no),
        bank_account_name: emptyToNull(parsed.bank_account_name),
        id_card_photo_url: emptyToNull(parsed.id_card_photo_url),
        selfie_photo_url: emptyToNull(parsed.selfie_photo_url),
        status: CandidateStatus.NEW,
        screening_score: autoScore,
        assigned_coordinator_id: coordinatorId,
      },
    });

    // Notif admin (WA + Telegram)
    const { notifyAdmin } = await import("@/lib/notify");
    void notifyAdmin(
      `Ada pendaftar baru ${candidate.full_name} dari ${candidate.city}, skill ${candidate.skills.join(", ")}. Score auto: ${autoScore}. /admin/recruitment/${candidate.id}`
    );

    return NextResponse.json({
      success: true,
      data: {
        id: candidate.id,
        screening_score: autoScore,
      },
    });
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json(
        { success: false, error: "Data tidak valid", details: e },
        { status: 400 }
      );
    }
    console.error("[candidates/register]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Gagal daftar" },
      { status: 500 }
    );
  }
}
