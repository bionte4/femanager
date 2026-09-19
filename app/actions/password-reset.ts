"use server";

import { z } from "zod";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "@/lib/password-reset";

type ActionResult =
  | { success: true; message?: string; debug_code?: string }
  | { success: false; error: string };

const phoneSchema = z.object({
  phone: z.string().min(10).max(20),
});

const resetSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().min(4).max(8),
  new_password: z.string().min(8).max(128),
  confirm_password: z.string().min(8).max(128),
});

export async function requestPasswordOtpAction(input: {
  phone: string;
}): Promise<ActionResult> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nomor HP tidak valid" };
  }

  const res = await requestPasswordResetOtp(parsed.data.phone);
  if (!res.ok) return { success: false, error: res.error };
  return {
    success: true,
    message: res.message,
    debug_code: res.debug_code,
  };
}

export async function resetPasswordWithOtpAction(input: {
  phone: string;
  code: string;
  new_password: string;
  confirm_password: string;
}): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Data tidak valid" };
  }
  if (parsed.data.new_password !== parsed.data.confirm_password) {
    return { success: false, error: "Konfirmasi password tidak sama" };
  }

  const res = await resetPasswordWithOtp({
    phone: parsed.data.phone,
    code: parsed.data.code,
    new_password: parsed.data.new_password,
  });
  if (!res.ok) return { success: false, error: res.error };
  return { success: true, message: "Password berhasil diganti. Silakan login." };
}
