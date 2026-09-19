type SendTelegramParams = {
  chat_id: string;
  message: string;
};

type SendTelegramResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
  raw?: unknown;
};

/**
 * Kirim pesan via Telegram Bot API (gratis).
 * Token: AppSetting integrations.telegram → fallback TELEGRAM_BOT_TOKEN
 */
export async function sendTelegram(
  params: SendTelegramParams
): Promise<SendTelegramResult> {
  const { getTelegramSettings } = await import("@/lib/app-settings");
  const cfg = await getTelegramSettings();

  if (!cfg.enabled) {
    console.warn("[telegram] disabled di Settings — skip");
    return { success: true, skipped: true };
  }

  const token = cfg.bot_token.trim();
  if (!token) {
    console.warn("[telegram] bot_token kosong — skip");
    return { success: true, skipped: true };
  }

  const chatId = params.chat_id.trim();
  if (!chatId) {
    return { success: false, error: "chat_id kosong" };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: params.message,
        disable_web_page_preview: true,
      }),
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok || (raw && raw.ok === false)) {
      console.error("[telegram] API error", res.status, raw);
      return {
        success: false,
        error:
          (raw && typeof raw.description === "string"
            ? raw.description
            : `Telegram HTTP ${res.status}`) || "Gagal kirim",
        raw,
      };
    }
    return { success: true, raw };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Telegram send failed";
    console.error("[telegram]", error);
    return { success: false, error };
  }
}

export async function getAdminTelegramChatId(): Promise<string | null> {
  const { getTelegramSettings } = await import("@/lib/app-settings");
  const cfg = await getTelegramSettings();
  const id = cfg.admin_chat_id.trim();
  return id || null;
}

/** Notifikasi ke chat admin Telegram (jika dikonfigurasi) */
export async function notifyAdminTelegram(
  message: string
): Promise<SendTelegramResult> {
  const chatId = await getAdminTelegramChatId();
  if (!chatId) {
    return { success: true, skipped: true };
  }
  return sendTelegram({ chat_id: chatId, message });
}
