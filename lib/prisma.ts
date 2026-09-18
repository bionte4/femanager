import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function isStaleClient(client: PrismaClient): boolean {
  // Setelah migrate model baru, HMR bisa pakai PrismaClient lama tanpa delegate
  const c = client as unknown as Record<string, { findMany?: unknown }>;
  return (
    typeof c.serviceCategory?.findMany !== "function" ||
    typeof c.appNotification?.findMany !== "function"
  );
}

const existing = globalForPrisma.prisma;
export const prisma =
  existing && !isStaleClient(existing) ? existing : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
