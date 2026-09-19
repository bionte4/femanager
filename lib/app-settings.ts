import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const SETTING_KEYS = {
  whatsapp: "integrations.whatsapp",
  telegram: "integrations.telegram",
  smtp: "integrations.smtp",
  ai: "integrations.ai",
} as const;

export type WhatsappSettings = {
  enabled: boolean;
  provider: "fonnte";
  token: string;
  admin_phone: string;
};

export type TelegramSettings = {
  enabled: boolean;
  bot_token: string;
  /** Chat ID admin (bisa grup atau private) */
  admin_chat_id: string;
};

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_email: string;
  from_name: string;
};

export type AiSettings = {
  enabled: boolean;
  provider: "openai_compatible" | "none";
  api_key: string;
  base_url: string;
  model: string;
};

export const DEFAULT_WHATSAPP: WhatsappSettings = {
  enabled: true,
  provider: "fonnte",
  token: "",
  admin_phone: "",
};

export const DEFAULT_TELEGRAM: TelegramSettings = {
  enabled: false,
  bot_token: "",
  admin_chat_id: "",
};

export const DEFAULT_SMTP: SmtpSettings = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  password: "",
  from_email: "",
  from_name: "FE-Track",
};

export const DEFAULT_AI: AiSettings = {
  enabled: false,
  provider: "none",
  api_key: "",
  base_url: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
};

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function getSettingJson(key: string): Promise<unknown | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSettingJson(
  key: string,
  value: unknown,
  updatedBy?: string
) {
  const json = value as Prisma.InputJsonValue;
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: json, updated_by: updatedBy ?? null },
    update: { value: json, updated_by: updatedBy ?? null },
  });
}

export async function getWhatsappSettings(): Promise<WhatsappSettings> {
  const raw = asObject(await getSettingJson(SETTING_KEYS.whatsapp));
  const envToken = process.env.FONNTE_TOKEN?.trim() ?? "";
  const envAdmin =
    process.env.ADMIN_WHATSAPP?.trim() ||
    process.env.ADMIN_PHONE?.trim() ||
    "";

  return {
    enabled: raw.enabled === undefined ? DEFAULT_WHATSAPP.enabled : !!raw.enabled,
    provider: "fonnte",
    token: String(raw.token ?? "") || envToken,
    admin_phone: String(raw.admin_phone ?? "") || envAdmin,
  };
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const raw = asObject(await getSettingJson(SETTING_KEYS.telegram));
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const envChat = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() ?? "";

  return {
    enabled: raw.enabled === undefined ? !!envToken : !!raw.enabled,
    bot_token: String(raw.bot_token ?? "") || envToken,
    admin_chat_id: String(raw.admin_chat_id ?? "") || envChat,
  };
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const raw = asObject(await getSettingJson(SETTING_KEYS.smtp));
  return {
    enabled: !!raw.enabled,
    host: String(raw.host ?? process.env.SMTP_HOST ?? ""),
    port: Number(raw.port ?? process.env.SMTP_PORT ?? 587) || 587,
    secure: raw.secure === undefined ? process.env.SMTP_SECURE === "1" : !!raw.secure,
    user: String(raw.user ?? process.env.SMTP_USER ?? ""),
    password: String(raw.password ?? process.env.SMTP_PASSWORD ?? ""),
    from_email: String(raw.from_email ?? process.env.SMTP_FROM_EMAIL ?? ""),
    from_name: String(raw.from_name ?? process.env.SMTP_FROM_NAME ?? "FE-Track"),
  };
}

export async function getAiSettings(): Promise<AiSettings> {
  const raw = asObject(await getSettingJson(SETTING_KEYS.ai));
  const envKey = process.env.AI_API_KEY?.trim() ?? "";
  const envBase = process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const envModel = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  const enabled =
    raw.enabled === undefined ? !!envKey : !!raw.enabled;
  const apiKey = String(raw.api_key ?? "") || envKey;

  return {
    enabled: enabled && !!apiKey,
    provider: apiKey || raw.api_key ? "openai_compatible" : "none",
    api_key: apiKey,
    base_url: String(raw.base_url ?? "") || envBase,
    model: String(raw.model ?? "") || envModel,
  };
}

/** Mask secret untuk UI — jangan kirim full token ke client */
export function maskSecret(value: string): {
  configured: boolean;
  hint: string;
} {
  const v = value.trim();
  if (!v) return { configured: false, hint: "" };
  if (v.length <= 4) return { configured: true, hint: "••••" };
  return { configured: true, hint: `••••${v.slice(-4)}` };
}

/** Jika input kosong & keepExisting → pertahankan nilai lama */
export function mergeSecret(
  incoming: string | undefined,
  existing: string,
  clear?: boolean
): string {
  if (clear) return "";
  const next = (incoming ?? "").trim();
  if (!next) return existing;
  if (next.startsWith("••••")) return existing;
  return next;
}
