import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser, notifyAdmin } from "@/lib/notify";

export type BirthdayGreetingsResult = {
  checked_at: string;
  timezone: string;
  today_md: string;
  candidates: number;
  sent: number;
  skipped_already: number;
  failed: number;
  user_ids: string[];
};

/** Tanggal “hari ini” di zona Asia/Jakarta (WIB). */
export function todayInJakarta(now = new Date()): {
  year: number;
  month: number;
  day: number;
  ymd: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? NaN);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return {
    year,
    month,
    day,
    ymd: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/**
 * Cocokkan bulan-hari. Feb 29 di tahun non-kabisat → sambut di 28 Feb.
 */
export function isBirthdayToday(
  birthDate: Date,
  today: { year: number; month: number; day: number }
): boolean {
  const bm = birthDate.getUTCMonth() + 1;
  const bd = birthDate.getUTCDate();
  if (bm === today.month && bd === today.day) return true;
  // Leap day: 29 Feb → 28 Feb di tahun non-kabisat
  if (bm === 2 && bd === 29 && today.month === 2 && today.day === 28) {
    const leap =
      (today.year % 4 === 0 && today.year % 100 !== 0) ||
      today.year % 400 === 0;
    return !leap;
  }
  return false;
}

function buildMessage(fullName: string, engagementType: string): string {
  const tip =
    engagementType === "PKWT_OUTTASK" || engagementType === "PKWT_INTERNAL"
      ? "PKWT"
      : "Mitra";
  return (
    `Selamat ulang tahun, ${fullName}! 🎂\n` +
    `Terima kasih sudah jadi bagian FE-Track (${tip}). ` +
    `Semoga sehat, lancar di lapangan, dan SLA selalu meet. ` +
    `Salam hangat dari tim FE-Track.`
  );
}

/**
 * Cron harian: ucapan ulang tahun ke field engineer (Mitra/PKWT) via WA + Telegram.
 * Idempotent per user per tahun kalender (WIB).
 */
export async function sendBirthdayGreetings(
  now = new Date()
): Promise<BirthdayGreetingsResult> {
  const today = todayInJakarta(now);
  const engineers = await prisma.user.findMany({
    where: {
      role: Role.FIELD_ENGINEER,
      birth_date: { not: null },
      is_suspended: false,
    },
    select: {
      id: true,
      full_name: true,
      phone: true,
      telegram_chat_id: true,
      engagement_type: true,
      birth_date: true,
    },
  });

  const candidates = engineers.filter(
    (e) => e.birth_date && isBirthdayToday(e.birth_date, today)
  );

  let sent = 0;
  let skippedAlready = 0;
  let failed = 0;
  const userIds: string[] = [];

  for (const e of candidates) {
    const existing = await prisma.birthdayGreetingLog.findUnique({
      where: {
        user_id_year: { user_id: e.id, year: today.year },
      },
    });
    if (existing) {
      skippedAlready += 1;
      continue;
    }

    const message = buildMessage(e.full_name, e.engagement_type);
    const res = await notifyUser({
      phone: e.phone,
      message,
      user_id: e.id,
      telegram_chat_id: e.telegram_chat_id,
    });

    const waOk = res.whatsapp.success && !res.whatsapp.skipped;
    const tgOk = res.telegram.success && !res.telegram.skipped;
    const channels =
      waOk && tgOk
        ? "both"
        : waOk
          ? "whatsapp"
          : tgOk
            ? "telegram"
            : "none";

    // Catat log meski channel gagal — agar tidak spam retry tiap jam cron
    // Hanya skip log jika keduanya hard-fail tanpa skip (token mati dsb) — tetap log "none"
    try {
      await prisma.birthdayGreetingLog.create({
        data: {
          user_id: e.id,
          year: today.year,
          channels,
        },
      });
    } catch {
      // unique race — treat as already sent
      skippedAlready += 1;
      continue;
    }

    if (waOk || tgOk) {
      sent += 1;
      userIds.push(e.id);
    } else {
      failed += 1;
    }
  }

  if (sent > 0) {
    const names = candidates
      .filter((c) => userIds.includes(c.id))
      .map((c) => c.full_name)
      .slice(0, 10)
      .join(", ");
    void notifyAdmin(
      `FE-Track: ucapan ulang tahun terkirim ke ${sent} engineer (${today.ymd}). ${names}`
    );
  }

  return {
    checked_at: now.toISOString(),
    timezone: "Asia/Jakarta",
    today_md: `${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`,
    candidates: candidates.length,
    sent,
    skipped_already: skippedAlready,
    failed,
    user_ids: userIds,
  };
}
