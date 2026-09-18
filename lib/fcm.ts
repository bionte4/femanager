import { prisma } from "@/lib/prisma";

export type FcmPayload = {
  title: string;
  body: string;
  href?: string | null;
  type?: string;
  ticket_id?: string | null;
};

/**
 * Kirim FCM ke semua device token user.
 * Graceful: tanpa FCM_SERVER_KEY → no-op (in-app notification tetap jalan).
 * Pakai Legacy HTTP API agar setup sederhana (server key).
 */
export async function sendFcmToUser(
  userId: string,
  payload: FcmPayload
): Promise<{ sent: number; failed: number }> {
  const serverKey = process.env.FCM_SERVER_KEY?.trim();
  if (!serverKey) {
    return { sent: 0, failed: 0 };
  }

  const tokens = await prisma.pushDeviceToken.findMany({
    where: { user_id: userId },
    select: { id: true, token: true },
  });

  if (tokens.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    tokens.map(async (row) => {
      try {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${serverKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: row.token,
            priority: "high",
            notification: {
              title: payload.title,
              body: payload.body,
              click_action: payload.href ?? undefined,
            },
            data: {
              title: payload.title,
              body: payload.body,
              href: payload.href ?? "",
              type: payload.type ?? "",
              ticket_id: payload.ticket_id ?? "",
            },
          }),
        });

        const json = (await res.json().catch(() => null)) as {
          success?: number;
          failure?: number;
          results?: { error?: string }[];
        } | null;

        if (!res.ok || (json?.failure && json.failure > 0)) {
          failed += 1;
          const err = json?.results?.[0]?.error;
          if (
            err === "NotRegistered" ||
            err === "InvalidRegistration" ||
            err === "MismatchSenderId"
          ) {
            staleIds.push(row.id);
          }
          return;
        }

        sent += 1;
        await prisma.pushDeviceToken.update({
          where: { id: row.id },
          data: { last_seen_at: new Date() },
        });
      } catch {
        failed += 1;
      }
    })
  );

  if (staleIds.length > 0) {
    await prisma.pushDeviceToken.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  return { sent, failed };
}

/** Broadcast FCM ke banyak user (fire-and-forget safe) */
export async function sendFcmToUsers(
  userIds: string[],
  payload: FcmPayload
): Promise<void> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  await Promise.all(unique.map((id) => sendFcmToUser(id, payload)));
}
