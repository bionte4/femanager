import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export class SessionInactiveError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "SessionInactiveError";
  }
}

/**
 * Session aktif: login + tidak suspended + role dari DB (bukan JWT stale).
 * Dipakai requireRoles / layout agar suspend & demote efektif tanpa tunggu JWT expire.
 */
export async function requireActiveSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new SessionInactiveError("Unauthorized");
  }

  const row = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      is_suspended: true,
      phone: true,
      full_name: true,
      partnership_status: true,
      engagement_type: true,
    },
  });

  if (!row || row.is_suspended) {
    throw new SessionInactiveError("Unauthorized — akun ditangguhkan");
  }

  // Sync claim JWT → nilai DB terkini
  session.user.role = row.role;
  session.user.phone = row.phone;
  session.user.name = row.full_name;
  session.user.partnership_status = row.partnership_status;
  session.user.engagement_type = row.engagement_type;

  return session;
}
