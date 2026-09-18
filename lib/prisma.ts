import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientRev?: number;
};

/** Naikkan angka ini setelah migrate field/model baru agar HMR buang client lama */
const PRISMA_CLIENT_REV = 3;

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

function isStaleClient(client: PrismaClient): boolean {
  // Setelah migrate model baru, HMR bisa pakai PrismaClient lama tanpa delegate
  const c = client as unknown as Record<string, { findMany?: unknown }>;
  return (
    typeof c.serviceCategory?.findMany !== "function" ||
    typeof c.appNotification?.findMany !== "function" ||
    typeof c.webhookDeadLetter?.findMany !== "function" ||
    typeof c.pushDeviceToken?.findMany !== "function" ||
    typeof c.sparepartMutation?.findMany !== "function" ||
    typeof c.engineerContract?.findMany !== "function" ||
    typeof c.engagementChangeLog?.findMany !== "function"
  );
}

const existing = globalForPrisma.prisma;
const revOk = globalForPrisma.prismaClientRev === PRISMA_CLIENT_REV;
export const prisma =
  existing && revOk && !isStaleClient(existing)
    ? existing
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientRev = PRISMA_CLIENT_REV;
}
