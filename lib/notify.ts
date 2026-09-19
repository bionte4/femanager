import { sendWhatsApp, getAdminWhatsAppPhone } from "@/lib/whatsapp";
import { sendTelegram, notifyAdminTelegram } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";

export type NotifyResult = {
  whatsapp: { success: boolean; skipped?: boolean; error?: string };
  telegram: { success: boolean; skipped?: boolean; error?: string };
};

/**
 * Notifikasi ke admin: WA admin + Telegram admin (keduanya opsional).
 * Berguna saat Fonnte berbayar — Telegram gratis sebagai channel utama admin.
 */
export async function notifyAdmin(message: string): Promise<NotifyResult> {
  const adminPhone = await getAdminWhatsAppPhone();
  const [whatsapp, telegram] = await Promise.all([
    adminPhone
      ? sendWhatsApp({ phone: adminPhone, message })
      : Promise.resolve({ success: true as const, skipped: true }),
    notifyAdminTelegram(message),
  ]);
  return { whatsapp, telegram };
}

/**
 * Notifikasi ke user: WA (phone) + Telegram jika telegram_chat_id terisi.
 */
export async function notifyUser(input: {
  phone: string;
  message: string;
  user_id?: string;
  telegram_chat_id?: string | null;
}): Promise<NotifyResult> {
  let chatId = input.telegram_chat_id?.trim() || "";
  if (!chatId && input.user_id) {
    const u = await prisma.user.findUnique({
      where: { id: input.user_id },
      select: { telegram_chat_id: true },
    });
    chatId = u?.telegram_chat_id?.trim() || "";
  }

  const [whatsapp, telegram] = await Promise.all([
    sendWhatsApp({ phone: input.phone, message: input.message }),
    chatId
      ? sendTelegram({ chat_id: chatId, message: input.message })
      : Promise.resolve({ success: true as const, skipped: true }),
  ]);

  return { whatsapp, telegram };
}
