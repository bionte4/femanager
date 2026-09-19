import { createHash, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhoneId, sendWhatsApp } from "@/lib/whatsapp";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_SEND_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 5;

export function phoneVariants(input: string): string[] {
  const digits = input.replace(/\D/g, "");
  const as62 = normalizePhoneId(digits);
  const as0 = as62.startsWith("62") ? `0${as62.slice(2)}` : digits;
  const asLocal = as62.startsWith("62") ? as62.slice(2) : digits;
  return Array.from(new Set([digits, as62, as0, asLocal].filter((p) => p.length >= 10)));
}

export async function findUserByPhoneFlexible(phone: string) {
  const variants = phoneVariants(phone);
  return prisma.user.findFirst({
    where: { phone: { in: variants } },
    select: {
      id: true,
      phone: true,
      full_name: true,
      is_suspended: true,
      telegram_chat_id: true,
    },
  });
}

function hashOtp(code: string, phone62: string): string {
  return createHash("sha256")
    .update(`${phone62}:${code}:fetrack-otp`)
    .digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export type OtpChannel = "whatsapp" | "telegram";

export type RequestOtpResult =
  | { ok: true; message: string; debug_code?: string; channel: OtpChannel }
  | { ok: false; error: string };

export async function requestPasswordResetOtp(
  phoneRaw: string,
  channel: OtpChannel = "whatsapp"
): Promise<RequestOtpResult> {
  const phone62 = normalizePhoneId(phoneRaw);
  if (phone62.length < 11) {
    return { ok: false, error: "Nomor HP tidak valid" };
  }

  const channelLabel = channel === "telegram" ? "Telegram" : "WhatsApp";
  // Jangan bocorkan apakah nomor terdaftar
  const genericOk = `Jika nomor terdaftar, kode OTP dikirim via ${channelLabel} (berlaku 10 menit).`;

  const user = await findUserByPhoneFlexible(phoneRaw);
  if (!user || user.is_suspended) {
    return { ok: true, message: genericOk, channel };
  }

  if (channel === "telegram" && !user.telegram_chat_id?.trim()) {
    return {
      ok: false,
      error:
        "Akun ini belum punya Telegram Chat ID. Pilih WhatsApp, atau minta admin mengisi Chat ID di profil.",
    };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.passwordResetOtp.count({
    where: { phone: phone62, created_at: { gte: since } },
  });
  if (recent >= MAX_SEND_PER_HOUR) {
    return {
      ok: false,
      error: "Terlalu banyak permintaan. Coba lagi dalam 1 jam.",
    };
  }

  const code = String(randomInt(100000, 999999));
  const codeHash = hashOtp(code, phone62);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.passwordResetOtp.create({
    data: {
      phone: phone62,
      code_hash: codeHash,
      expires_at: expiresAt,
    },
  });

  const otpMsg = `FE-Track: kode OTP reset password Anda adalah ${code}. Berlaku 10 menit. Jangan bagikan ke siapa pun.`;

  if (channel === "telegram") {
    const { sendTelegram } = await import("@/lib/telegram");
    const tg = await sendTelegram({
      chat_id: user.telegram_chat_id!.trim(),
      message: otpMsg,
    });
    if (tg.skipped) {
      return {
        ok: false,
        error:
          "Telegram belum aktif. Aktifkan bot di Settings → Integrations, lalu coba lagi.",
      };
    }
    if (!tg.success) {
      return {
        ok: false,
        error: tg.error || "Gagal kirim OTP Telegram. Coba WhatsApp atau hubungi admin.",
      };
    }
  } else {
    const wa = await sendWhatsApp({
      phone: user.phone,
      message: `FE-Track: kode OTP reset password Anda adalah *${code}*. Berlaku 10 menit. Jangan bagikan ke siapa pun.`,
    });
    if (wa.skipped) {
      return {
        ok: false,
        error:
          "WhatsApp belum siap. Set gateway di Settings → Integrations, atau pilih Telegram.",
      };
    }
    if (!wa.success) {
      return {
        ok: false,
        error: wa.error || "Gagal kirim OTP WhatsApp. Coba Telegram atau hubungi admin.",
      };
    }
  }

  const result: RequestOtpResult = { ok: true, message: genericOk, channel };
  if (process.env.NODE_ENV !== "production" && process.env.OTP_DEBUG === "1") {
    result.debug_code = code;
  }
  return result;
}

export type ResetWithOtpResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resetPasswordWithOtp(input: {
  phone: string;
  code: string;
  new_password: string;
}): Promise<ResetWithOtpResult> {
  const phone62 = normalizePhoneId(input.phone);
  const code = input.code.replace(/\D/g, "").trim();
  const newPassword = input.new_password;

  if (code.length !== 6) {
    return { ok: false, error: "Kode OTP harus 6 digit" };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "Password baru minimal 8 karakter" };
  }

  const user = await findUserByPhoneFlexible(input.phone);
  if (!user || user.is_suspended) {
    return { ok: false, error: "OTP tidak valid atau sudah kadaluarsa" };
  }

  const otp = await prisma.passwordResetOtp.findFirst({
    where: {
      phone: phone62,
      consumed_at: null,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
  });

  if (!otp) {
    return { ok: false, error: "OTP tidak valid atau sudah kadaluarsa" };
  }

  if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan. Minta OTP baru.",
    };
  }

  const expected = hashOtp(code, phone62);
  const match = safeEqualHex(expected, otp.code_hash);

  if (!match) {
    await prisma.passwordResetOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Kode OTP salah" };
  }

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    }),
    prisma.passwordResetOtp.update({
      where: { id: otp.id },
      data: { consumed_at: new Date() },
    }),
    // Invalidate OTP lain untuk nomor yang sama
    prisma.passwordResetOtp.updateMany({
      where: {
        phone: phone62,
        consumed_at: null,
        id: { not: otp.id },
      },
      data: { consumed_at: new Date() },
    }),
  ]);

  return { ok: true };
}
