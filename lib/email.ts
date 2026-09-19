import nodemailer from "nodemailer";
import { getSmtpSettings } from "@/lib/app-settings";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export type SendEmailResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: string;
};

/**
 * Kirim email via SMTP (settings admin atau env SMTP_*).
 * Jika disabled / host kosong → skip (success + skipped).
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const cfg = await getSmtpSettings();
  if (!cfg.enabled || !cfg.host || !cfg.from_email) {
    console.warn("[email] SMTP belum dikonfigurasi — skip");
    return { success: true, skipped: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user
        ? {
            user: cfg.user,
            pass: cfg.password,
          }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: cfg.from_name
        ? `"${cfg.from_name}" <${cfg.from_email}>`
        : cfg.from_email,
      to: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return { success: true, messageId: info.messageId };
  } catch (e) {
    const error = e instanceof Error ? e.message : "SMTP send failed";
    console.error("[email]", error);
    return { success: false, error };
  }
}

/** Test koneksi SMTP (verify) */
export async function verifySmtpConnection(): Promise<SendEmailResult> {
  const cfg = await getSmtpSettings();
  if (!cfg.enabled || !cfg.host) {
    return { success: false, error: "SMTP belum diaktifkan / host kosong" };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user
        ? { user: cfg.user, pass: cfg.password }
        : undefined,
    });
    await transporter.verify();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Verify gagal",
    };
  }
}
