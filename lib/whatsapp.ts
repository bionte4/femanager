type SendWhatsAppParams = {
  phone: string;
  message: string;
};

type SendWhatsAppResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
  raw?: unknown;
};

/** Normalisasi nomor Indo → 62xxxxxxxxxxx */
export function normalizePhoneId(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/**
 * Kirim WA via Fonnte API
 * Docs: https://fonnte.com — POST https://api.fonnte.com/send
 */
export async function sendWhatsApp(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn("[whatsapp] FONNTE_TOKEN kosong — skip kirim WA");
    return { success: true, skipped: true };
  }

  const target = normalizePhoneId(params.phone);

  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message: params.message,
      }),
    });

    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[whatsapp] Fonnte error", res.status, raw);
      return { success: false, error: `Fonnte HTTP ${res.status}`, raw };
    }

    return { success: true, raw };
  } catch (e) {
    const error = e instanceof Error ? e.message : "WA send failed";
    console.error("[whatsapp]", error);
    return { success: false, error };
  }
}

export function buildDispatchMessage(ticketNo: string, tenantName: string): string {
  return `Ada ticket baru ${ticketNo} di ${tenantName}. Segera Accept di app FE-Track.`;
}

export function buildReassignMessage(
  ticketNo: string,
  tenantName: string,
  attempt: number
): string {
  return `Ticket ${ticketNo} di ${tenantName} di-reassign ke kamu (percobaan #${attempt}). Segera Accept di app FE-Track.`;
}
