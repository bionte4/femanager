"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSystemAdmin } from "@/lib/rbac";
import {
  DEFAULT_AI,
  DEFAULT_SMTP,
  DEFAULT_TELEGRAM,
  DEFAULT_WHATSAPP,
  SETTING_KEYS,
  getAiSettings,
  getSettingJson,
  getSmtpSettings,
  getTelegramSettings,
  getWhatsappSettings,
  maskSecret,
  mergeSecret,
  setSettingJson,
  type AiSettings,
  type SmtpSettings,
  type TelegramSettings,
  type WhatsappSettings,
} from "@/lib/app-settings";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendTelegram } from "@/lib/telegram";
import { sendEmail, verifySmtpConnection } from "@/lib/email";
import { chatCompletion } from "@/lib/ai";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireSettingsAdmin() {
  return requireSystemAdmin();
}

export type IntegrationsPublicConfig = {
  whatsapp: {
    enabled: boolean;
    provider: string;
    admin_phone: string;
    token: { configured: boolean; hint: string };
    source_hint: string;
  };
  telegram: {
    enabled: boolean;
    admin_chat_id: string;
    bot_token: { configured: boolean; hint: string };
  };
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    from_email: string;
    from_name: string;
    password: { configured: boolean; hint: string };
  };
  ai: {
    enabled: boolean;
    provider: string;
    base_url: string;
    model: string;
    api_key: { configured: boolean; hint: string };
  };
};

export async function getIntegrationsSettingsAction(): Promise<IntegrationsPublicConfig> {
  await requireSettingsAdmin();
  const [wa, tg, smtp, ai] = await Promise.all([
    getWhatsappSettings(),
    getTelegramSettings(),
    getSmtpSettings(),
    getAiSettings(),
  ]);

  const waDb = await getSettingJson(SETTING_KEYS.whatsapp);
  const sourceHint = waDb
    ? "Disimpan di database (override env)"
    : "Menggunakan fallback .env jika field kosong";

  return {
    whatsapp: {
      enabled: wa.enabled,
      provider: wa.provider,
      admin_phone: wa.admin_phone,
      token: maskSecret(wa.token),
      source_hint: sourceHint,
    },
    telegram: {
      enabled: tg.enabled,
      admin_chat_id: tg.admin_chat_id,
      bot_token: maskSecret(tg.bot_token),
    },
    smtp: {
      enabled: smtp.enabled,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      from_email: smtp.from_email,
      from_name: smtp.from_name,
      password: maskSecret(smtp.password),
    },
    ai: {
      enabled: ai.enabled,
      provider: ai.provider,
      base_url: ai.base_url,
      model: ai.model,
      api_key: maskSecret(ai.api_key),
    },
  };
}

const waSchema = z.object({
  enabled: z.boolean(),
  admin_phone: z.string().max(20).optional(),
  token: z.string().optional(),
  clear_token: z.boolean().optional(),
});

export async function saveWhatsappSettingsAction(
  input: z.infer<typeof waSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSettingsAdmin();
    const parsed = waSchema.parse(input);
    const current = await getWhatsappSettings();
    const next: WhatsappSettings = {
      ...DEFAULT_WHATSAPP,
      enabled: parsed.enabled,
      admin_phone: (parsed.admin_phone ?? "").trim(),
      token: mergeSecret(parsed.token, current.token, parsed.clear_token),
    };
    await setSettingJson(SETTING_KEYS.whatsapp, next, session.user.id);
    revalidatePath("/admin/integrations");
    revalidatePath("/admin/settings/integrations");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal simpan WA",
    };
  }
}

const telegramSchema = z.object({
  enabled: z.boolean(),
  admin_chat_id: z.string().max(64).optional(),
  bot_token: z.string().optional(),
  clear_token: z.boolean().optional(),
});

export async function saveTelegramSettingsAction(
  input: z.infer<typeof telegramSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSettingsAdmin();
    const parsed = telegramSchema.parse(input);
    const current = await getTelegramSettings();
    const next: TelegramSettings = {
      ...DEFAULT_TELEGRAM,
      enabled: parsed.enabled,
      admin_chat_id: (parsed.admin_chat_id ?? "").trim(),
      bot_token: mergeSecret(parsed.bot_token, current.bot_token, parsed.clear_token),
    };
    await setSettingJson(SETTING_KEYS.telegram, next, session.user.id);
    revalidatePath("/admin/integrations");
    revalidatePath("/admin/settings/integrations");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal simpan Telegram",
    };
  }
}

const smtpSchema = z.object({
  enabled: z.boolean(),
  host: z.string().max(200).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  user: z.string().max(200).optional(),
  password: z.string().optional(),
  clear_password: z.boolean().optional(),
  from_email: z.string().max(200).optional(),
  from_name: z.string().max(100).optional(),
});

export async function saveSmtpSettingsAction(
  input: z.infer<typeof smtpSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSettingsAdmin();
    const parsed = smtpSchema.parse(input);
    const current = await getSmtpSettings();
    const next: SmtpSettings = {
      ...DEFAULT_SMTP,
      enabled: parsed.enabled,
      host: (parsed.host ?? "").trim(),
      port: parsed.port ?? 587,
      secure: !!parsed.secure,
      user: (parsed.user ?? "").trim(),
      password: mergeSecret(
        parsed.password,
        current.password,
        parsed.clear_password
      ),
      from_email: (parsed.from_email ?? "").trim(),
      from_name: (parsed.from_name ?? "FE-Track").trim() || "FE-Track",
    };
    await setSettingJson(SETTING_KEYS.smtp, next, session.user.id);
    revalidatePath("/admin/integrations");
    revalidatePath("/admin/settings/integrations");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal simpan SMTP",
    };
  }
}

const aiSchema = z.object({
  enabled: z.boolean(),
  base_url: z.string().max(300).optional(),
  model: z.string().max(100).optional(),
  api_key: z.string().optional(),
  clear_api_key: z.boolean().optional(),
});

export async function saveAiSettingsAction(
  input: z.infer<typeof aiSchema>
): Promise<ActionResult> {
  try {
    const session = await requireSettingsAdmin();
    const parsed = aiSchema.parse(input);
    const current = await getAiSettings();
    const apiKey = mergeSecret(
      parsed.api_key,
      current.api_key,
      parsed.clear_api_key
    );
    const next: AiSettings = {
      ...DEFAULT_AI,
      enabled: parsed.enabled && !!apiKey,
      provider: apiKey ? "openai_compatible" : "none",
      base_url:
        (parsed.base_url ?? "").trim() || "https://api.openai.com/v1",
      model: (parsed.model ?? "").trim() || "gpt-4o-mini",
      api_key: apiKey,
    };
    await setSettingJson(SETTING_KEYS.ai, next, session.user.id);
    revalidatePath("/admin/integrations");
    revalidatePath("/admin/settings/integrations");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal simpan AI",
    };
  }
}

export async function testWhatsappAction(
  phone?: string
): Promise<ActionResult> {
  try {
    await requireSettingsAdmin();
    const cfg = await getWhatsappSettings();
    const target = (phone || cfg.admin_phone).trim();
    if (!target) {
      return { success: false, error: "Isi nomor admin / nomor uji" };
    }
    const res = await sendWhatsApp({
      phone: target,
      message: "FE-Track test WhatsApp — konfigurasi OK.",
    });
    if (res.skipped) {
      return {
        success: false,
        error: "WA di-skip (disabled atau token kosong)",
      };
    }
    if (!res.success) {
      return { success: false, error: res.error ?? "Gagal kirim" };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Test WA gagal",
    };
  }
}

export async function testTelegramAction(
  chatId?: string
): Promise<ActionResult> {
  try {
    await requireSettingsAdmin();
    const cfg = await getTelegramSettings();
    const target = (chatId || cfg.admin_chat_id).trim();
    if (!target) {
      return { success: false, error: "Isi admin chat ID / chat uji" };
    }
    const res = await sendTelegram({
      chat_id: target,
      message: "FE-Track test Telegram — konfigurasi OK.",
    });
    if (res.skipped) {
      return {
        success: false,
        error: "Telegram di-skip (disabled atau bot token kosong)",
      };
    }
    if (!res.success) {
      return { success: false, error: res.error ?? "Gagal kirim" };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Test Telegram gagal",
    };
  }
}

export async function testSmtpAction(
  toEmail?: string
): Promise<ActionResult> {
  try {
    await requireSettingsAdmin();
    const verify = await verifySmtpConnection();
    if (!verify.success) {
      return { success: false, error: verify.error ?? "Verify gagal" };
    }
    const cfg = await getSmtpSettings();
    const to = (toEmail || cfg.from_email).trim();
    if (!to) {
      return { success: false, error: "Isi email tujuan uji" };
    }
    const res = await sendEmail({
      to,
      subject: "FE-Track SMTP test",
      text: "Konfigurasi SMTP berhasil.",
      html: "<p>Konfigurasi SMTP <strong>berhasil</strong>.</p>",
    });
    if (res.skipped) {
      return { success: false, error: "SMTP di-skip (disabled)" };
    }
    if (!res.success) {
      return { success: false, error: res.error ?? "Gagal kirim email" };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Test SMTP gagal",
    };
  }
}

export async function testAiAction(): Promise<ActionResult<{ reply: string }>> {
  try {
    await requireSettingsAdmin();
    const res = await chatCompletion({
      messages: [
        {
          role: "user",
          content: "Balas satu kalimat: FE-Track AI OK.",
        },
      ],
      max_tokens: 40,
    });
    if (!res.ok) {
      return { success: false, error: res.error };
    }
    return { success: true, data: { reply: res.content } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Test AI gagal",
    };
  }
}
