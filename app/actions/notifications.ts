"use server";

import { prisma } from "@/lib/prisma";
import { auth, ADMIN_ROLES } from "@/lib/auth";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getMyNotifications(limit = 20) {
  const session = await requireUser();
  const items = await prisma.appNotification.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    take: Math.min(50, Math.max(5, limit)),
  });

  const unread = await prisma.appNotification.count({
    where: { user_id: session.user.id, read_at: null },
  });

  return { items, unread };
}

export async function markNotificationRead(id: string) {
  const session = await requireUser();
  await prisma.appNotification.updateMany({
    where: { id, user_id: session.user.id, read_at: null },
    data: { read_at: new Date() },
  });
  return { success: true as const };
}

export async function markAllNotificationsRead() {
  const session = await requireUser();
  await prisma.appNotification.updateMany({
    where: { user_id: session.user.id, read_at: null },
    data: { read_at: new Date() },
  });
  return { success: true as const };
}

export async function getUnreadNotificationCount() {
  const session = await auth();
  if (!session?.user) return 0;
  if (!(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    // Engineer juga boleh lihat bell di layout engineer nanti
  }
  return prisma.appNotification.count({
    where: { user_id: session.user.id, read_at: null },
  });
}
