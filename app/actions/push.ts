"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

/** Register / refresh FCM device token untuk user login */
export async function registerPushTokenAction(input: {
  token: string;
  platform?: string;
  user_agent?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const token = input.token?.trim();
    if (!token || token.length < 20) {
      return { success: false, error: "Token tidak valid" };
    }

    const platform = (input.platform?.trim() || "web").slice(0, 32);

    await prisma.pushDeviceToken.upsert({
      where: { token },
      create: {
        user_id: session.user.id,
        token,
        platform,
        user_agent: input.user_agent?.slice(0, 255) ?? null,
      },
      update: {
        user_id: session.user.id,
        platform,
        user_agent: input.user_agent?.slice(0, 255) ?? null,
        last_seen_at: new Date(),
      },
    });

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal register push token",
    };
  }
}

export async function unregisterPushTokenAction(input: {
  token: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const token = input.token?.trim();
    if (!token) return { success: false, error: "Token kosong" };

    await prisma.pushDeviceToken.deleteMany({
      where: { token, user_id: session.user.id },
    });

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Gagal unregister",
    };
  }
}
