import { getAiSettings } from "@/lib/app-settings";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiChatResult =
  | { ok: true; content: string; model: string }
  | { ok: false; error: string; skipped?: boolean };

/**
 * Chat completion OpenAI-compatible (OpenAI / Groq / lokal / Azure-style base URL).
 * Dipakai KB chat bila AI enabled di Settings.
 */
export async function chatCompletion(params: {
  messages: AiChatMessage[];
  temperature?: number;
  max_tokens?: number;
}): Promise<AiChatResult> {
  const cfg = await getAiSettings();
  if (!cfg.enabled || !cfg.api_key) {
    return { ok: false, error: "AI belum dikonfigurasi", skipped: true };
  }

  const base = cfg.base_url.replace(/\/$/, "");
  const url = `${base}/chat/completions`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.max_tokens ?? 800,
      }),
    });

    const raw = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const msg =
        raw?.error?.message || `AI HTTP ${res.status}`;
      console.error("[ai]", msg);
      return { ok: false, error: msg };
    }

    const content = raw?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Respons AI kosong" };
    }

    return { ok: true, content, model: cfg.model };
  } catch (e) {
    const error = e instanceof Error ? e.message : "AI request failed";
    console.error("[ai]", error);
    return { ok: false, error };
  }
}
