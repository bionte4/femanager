import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientRev?: number;
};

/** Naikkan setelah migrate model baru agar HMR buang client lama (harus restart `next` juga setelah `prisma generate`) */
const PRISMA_CLIENT_REV = 7;

function createPrismaClient() {
  // Jangan log setiap query di dev — spam I/O bikin terasa hang saat compile
  return new PrismaClient({
    log:
      process.env.PRISMA_LOG_QUERY === "1"
        ? ["query", "error", "warn"]
        : process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
  });
}

function hasDelegate(
  client: PrismaClient,
  name: string
): boolean {
  const c = client as unknown as Record<string, { findMany?: unknown }>;
  return typeof c[name]?.findMany === "function";
}

function isStaleClient(client: PrismaClient): boolean {
  // Setelah migrate model baru, HMR bisa pakai PrismaClient lama tanpa delegate
  return (
    !hasDelegate(client, "serviceCategory") ||
    !hasDelegate(client, "appNotification") ||
    !hasDelegate(client, "webhookDeadLetter") ||
    !hasDelegate(client, "pushDeviceToken") ||
    !hasDelegate(client, "sparepartMutation") ||
    !hasDelegate(client, "engineerContract") ||
    !hasDelegate(client, "engagementChangeLog") ||
    !hasDelegate(client, "appSetting") ||
    !hasDelegate(client, "passwordResetOtp") ||
    !hasDelegate(client, "warehouse")
  );
}

const existing = globalForPrisma.prisma;
const revOk = globalForPrisma.prismaClientRev === PRISMA_CLIENT_REV;

if (existing && (!revOk || isStaleClient(existing))) {
  void existing.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaClientRev === PRISMA_CLIENT_REV &&
  !isStaleClient(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientRev = PRISMA_CLIENT_REV;
}
